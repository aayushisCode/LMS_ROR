
module UserCourse::Operation
  class Index < ApplicationOperation
    step :fetch_user_courses

    def fetch_user_courses(ctx, params:, current_user:, **)
      authorize_record(ctx, UserCourse, :index?)
      user_courses = policy_scope_for(ctx, UserCourse)
      user_courses = user_courses.where(user_id: params[:user_id]) if params[:user_id].present?
      ctx[:models] = user_courses.includes(
        :user_lesson_progresses,
        :user_quizzes,
        course: [{ lessons: :lesson_pages }, :quizzes]
      )
      learner_request = current_user&.role&.name == "learner"
      ctx[:response_data] = {
        data: ctx[:models].map do |assignment|
          {
            id: assignment.id,
            user_id: assignment.user_id,
            course_id: assignment.course_id,
            status: assignment.status,
            progress_percentage: assignment.progress_percentage,
            completed_lessons: assignment.completed_lessons,
            total_lessons: assignment.total_lessons,
            due_date: assignment.due_date,
            completed_at: assignment.completed_at,
              resume_position: assignment.resume_position,
            course: {
              id: assignment.course.id,
              title: assignment.course.title,
                description: assignment.course.description,
                status: assignment.course.status,
                lessons: assignment.course.lessons.select { |lesson| !learner_request || lesson.status == "active" }.sort_by(&:position).map do |lesson|
                lesson_progress_payload(lesson, assignment, learner_request)
                end,
                final_quiz: final_quiz_payload(assignment)
            },
            final_quiz: final_quiz_payload(assignment)
          }
        end
      }
      true
    end

    def lesson_progress_payload(lesson, assignment, learner_request)
      pages = lesson.lesson_pages.to_a
      progress = assignment.user_lesson_progresses.find { |item| item.lesson_id == lesson.id }
      quiz = assignment.course.quizzes.find do |item|
        item.quiz_type == "lesson" && item.lesson_id == lesson.id && lesson.status == "active"
      end
      attempts = quiz ? attempts_for(assignment, quiz) : []
      latest_attempt = attempts.max_by(&:attempt_number)
      calculation = Progress::LessonCalculator.call(
        lesson: lesson,
        progress: progress,
        quiz: quiz,
        quiz_passed: attempts.any? { |attempt| attempt.status == "submitted" && attempt.result == "pass" },
        quiz_attempted: attempts.any?
      )
      page_metadata = (progress&.metadata || {}).fetch("pages", {})

      {
        id: lesson.id,
        title: lesson.title,
        position: lesson.position,
        lesson_progress: {
          id: progress&.id,
          status: calculation[:status],
          completed_pages: calculation[:completed_pages],
          total_pages: calculation[:total_pages],
          progress_percentage: calculation[:progress_percentage],
          started_at: progress&.started_at,
          completed_at: progress&.completed_at
        },
        lesson_quiz: quiz && quiz_payload(quiz, latest_attempt),
        lesson_pages: pages.map do |page|
          page_data = page_metadata[page.id.to_s] || {}
          {
            id: page.id,
            title: page.title,
            topic: page.topic,
            position: page.position,
            content: learner_page_content?(lesson, page, assignment, progress, learner_request) ? page.content : nil,
            metadata: page.metadata,
            user_lesson_progress: { completed: page_data["completed"] == true }
          }
        end
      }
    end

    def learner_page_content?(lesson, page, assignment, progress, learner_request)
      return true unless learner_request

      pages = lesson.lesson_pages.to_a
      page_states = progress&.metadata&.fetch("pages", {}) || {}
      return true if page_states.dig(page.id.to_s, "completed") == true

      current_index = pages.index(page)
      completed_before = pages.take(current_index).all? { |item| page_states.dig(item.id.to_s, "completed") == true }
      first_or_resumed = if assignment.current_lesson_id == lesson.id
                           assignment.current_page_number == page.position
                         else
                           assignment.current_lesson_id.nil? && current_index.zero?
                          end
      completed_before && first_or_resumed
    end

    def final_quiz_payload(assignment)
      quiz = assignment.course.quizzes.find do |item|
        item.quiz_type == "final" && item.lesson_id.nil?
      end
      return nil unless quiz

      latest_attempt = attempts_for(assignment, quiz).max_by(&:attempt_number)
      quiz_payload(quiz, latest_attempt, pending_until_submitted: true)
    end

    def quiz_payload(quiz, attempt, pending_until_submitted: false)
      submitted = attempt&.status == "submitted"
      {
        id: quiz.id,
        title: quiz.title,
        quiz_type: quiz.quiz_type,
        status: quiz_status(attempt),
        attempt_status: attempt&.status,
        attempt_number: attempt&.attempt_number,
        result: submitted ? attempt.result : nil,
        score: submitted ? attempt.score : nil,
        total_marks: submitted ? attempt.total_marks : nil,
        percentage: submitted ? attempt.percentage : nil,
        submitted_at: submitted ? attempt.submitted_at : nil
      }
    end

    def quiz_status(attempt)
      return "Not Started" unless attempt
      return "In Progress" if attempt.status == "in_progress"
      return "Passed" if attempt.result == "pass"
      return "Failed" if attempt.result == "fail"

      "Not Started"
    end

    def attempts_for(assignment, quiz)
      assignment.user_quizzes.select { |attempt| attempt.quiz_id == quiz.id }
    end
  end
end
