
module Quiz::Operation
  class Create < ApplicationOperation
    step :authorize_create
    step Model(Quiz, :new)
    step :build_quiz
    step :save_quiz

    fail :handle_failure
    step :set_response

    def authorize_create(ctx, **)
      authorize_record(ctx, Quiz, :create?)
    end

    def build_quiz(ctx, params:, **)
      quiz_params = params.require(:quiz).permit(
        :course_id, :lesson_id, :title, :description, :quiz_type, :pass_marks
      )
      quiz_params[:course_id] ||= params[:course_id] if params[:course_id].present?
      ctx[:model].assign_attributes(
        permitted_attributes(quiz_params)
      )
      ctx[:question_ids] = params.require(:quiz)[:question_ids]

      true
    end

    def save_quiz(ctx, **)
      question_ids = Array(ctx[:question_ids]).reject(&:blank?)
      if question_ids.uniq.size != question_ids.size
        ctx[:errors] = ["Questions cannot be duplicated"]
        return false
      end
      ActiveRecord::Base.transaction do
        unless ctx[:model].save
          ctx[:errors] = ctx[:model].errors.full_messages
          raise ActiveRecord::Rollback
        end
        questions = Question.where(id: question_ids, course_id: ctx[:model].course_id, quiz_id: nil).order(:id).lock.to_a
        if questions.size != question_ids.size
          ctx[:errors] = ["Selected questions must be unassigned and belong to this course"]
          raise ActiveRecord::Rollback
        end
        questions.each_with_index { |q, i| q.update!(quiz: ctx[:model], position: i + 1) }
      end
      return false if ctx[:errors]

      true
    end

    def set_response(ctx, **)
      ctx[:response_data] = { data: ctx[:model] }
      ctx[:status] = :created
    end

    def handle_failure(ctx, **)
      ctx[:error] ||= {
        msg: ctx[:errors]&.join(", ") || "Unable to create quiz",
        status: :unprocessable_entity
      }
    end

    private

    def permitted_attributes(quiz_params)
      quiz_params.to_h.symbolize_keys.slice(
        :course_id,
        :lesson_id,
        :title,
        :description,
        :quiz_type,
        :pass_marks
      )
    end
  end
end
