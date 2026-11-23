
module Quiz::Operation
  class Show < ApplicationOperation
    step :set_quiz
    fail :handle_failure

    def set_quiz(ctx, params:, **)
      ctx[:model] = policy_scope_for(ctx, Quiz).find_by(id: params[:id])
      return false unless ctx[:model]
      authorize_record(ctx, ctx[:model], :show?)
      if ctx[:current_user]&.learner?
        assignment = policy_scope_for(ctx, UserCourse).find_by(id: params[:user_course_id])
        unless assignment && assignment.course_id == ctx[:model].course_id && quiz_unlocked?(assignment, ctx[:model])
          ctx[:error] = { msg: "This quiz is locked", status: :forbidden }
          return false
        end
      end
      ctx[:response_data] = {
        data: ctx[:model].as_json(
          only: [:id, :course_id, :lesson_id, :title, :description, :quiz_type, :pass_marks, :created_at, :updated_at],
          include: { questions: { only: [:id, :question_code, :question_text, :question_type, :marks, :position, :status], include: { options: { only: [:id, :option_text, :position] } } } }
        )
      }
      ctx[:status] = :ok
      true
    end

    def quiz_unlocked?(assignment, quiz)
      lessons = assignment.course.lessons.where(status: "active").order(:position).to_a
      if quiz.quiz_type == "lesson"
        lesson = lessons.find { |item| item.id == quiz.lesson_id }
        return false unless lesson
        return false unless lessons.take_while { |item| item.position < lesson.position }.all? { |item| complete_with_quiz?(assignment, item) }

        pages_complete?(assignment, lesson)
      else
        lessons.all? { |item| complete_with_quiz?(assignment, item) }
      end
    end

    def complete_with_quiz?(assignment, lesson)
      return false unless pages_complete?(assignment, lesson)

      lesson_quiz = lesson.quizzes.find { |item| item.quiz_type == "lesson" }
      !lesson_quiz || assignment.user_quizzes.exists?(quiz_id: lesson_quiz.id, status: "submitted", result: "pass")
    end

    def pages_complete?(assignment, lesson)
      pages = lesson.lesson_pages.to_a
      progress = assignment.user_lesson_progresses.find_by(lesson_id: lesson.id)
      states = progress&.metadata&.fetch("pages", {}) || {}
      pages.any? && pages.all? { |page| states.dig(page.id.to_s, "completed") == true }
    end

    def handle_failure(ctx, **)
      ctx[:error] ||= {
        msg: "Quiz not found",
        status: :not_found
      }
    end
  end
end
