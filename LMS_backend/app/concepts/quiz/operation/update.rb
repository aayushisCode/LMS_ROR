
class Quiz::Operation::Update < ApplicationOperation
  step :update_quiz
  fail :handle_failure
  step :set_response

  def update_quiz(ctx, params:, **)
    model = policy_scope_for(ctx, Quiz).find_by(id: params[:id])
    return false unless model
    authorize_record(ctx, model, :update?)
    quiz_params = params.require(:quiz).permit(
      :course_id, :lesson_id, :title, :description, :quiz_type, :pass_marks, question_ids: []
    )
    quiz_params[:course_id] ||= params[:course_id] if params[:course_id].present?
    question_ids = quiz_params.delete(:question_ids)
    if question_ids && question_ids.uniq.size != question_ids.size
      ctx[:errors] = ["Questions cannot be duplicated"]
      return false
    end
    if question_ids && model.user_quizzes.exists? && (model.questions.pluck(:id).sort != question_ids.sort)
      ctx[:errors] = ["Quiz questions cannot change after learner attempts exist"]
      return false
    end
    if quiz_params[:course_id].present? && quiz_params[:course_id] != model.course_id && question_ids.nil? && model.questions.exists?
      ctx[:errors] = ["Select questions for the new course before changing this quiz's course"]
      return false
    end
    new_course_id = quiz_params[:course_id] || model.course_id
    questions = if question_ids
      Question.where(id: question_ids, course_id: new_course_id).where(quiz_id: [nil, model.id])
    end
    ActiveRecord::Base.transaction do
      selected_questions = questions&.order(:id)&.lock&.to_a
      if question_ids && selected_questions.size != question_ids.size
        ctx[:errors] = ["Selected questions must be unassigned or already in this quiz, and belong to its course"]
        raise ActiveRecord::Rollback
      end
      unless model.update(quiz_params)
        ctx[:errors] = model.errors.full_messages
        raise ActiveRecord::Rollback
      end
      if question_ids
        (model.questions.pluck(:id) - question_ids).each { |id| model.questions.find(id).update!(quiz_id: nil, position: nil) }
        model.questions.update_all(position: nil)
        selected_questions.each_with_index { |question, index| question.update!(quiz: model, position: index + 1) }
      end
    end
  rescue ActiveRecord::RecordInvalid => e
    ctx[:errors] = e.record.errors.full_messages
    false
  else
    return false if ctx[:errors]

    ctx[:model] = model
    true
  end

  def set_response(ctx, **)
    ctx[:response_data] = { data: ctx[:model] }
    ctx[:status] = :ok
  end

  def handle_failure(ctx, **)
    ctx[:error] ||= {
      msg: ctx[:errors]&.join(", ") || "Unable to update quiz",
      status: :unprocessable_entity
    }
  end
end
