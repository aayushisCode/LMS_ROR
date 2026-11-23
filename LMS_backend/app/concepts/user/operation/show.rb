
module User::Operation
  class Show < ApplicationOperation
    step :find_user
    fail :handle_failure

    def find_user(ctx, params:, **)
      ctx[:model] = policy_scope_for(ctx, User).includes(user_courses: :course).find_by(id: params[:id])
      return false unless ctx[:model]
      authorize_record(ctx, ctx[:model], :show?)

      user = ctx[:model]
      courses = user.user_courses.map do |assignment|
        {
          id: assignment.course_id,
          title: assignment.course.title,
          status: assignment.status,
          progress_percentage: assignment.progress_percentage,
          completed_lessons: assignment.completed_lessons,
          total_lessons: assignment.total_lessons,
          assigned_at: assignment.assigned_at,
          due_date: assignment.due_date,
          completed_at: assignment.completed_at
        }
      end
      user_data = user.as_json(only: [:id, :name, :email, :address, :contact, :active, :role_id, :created_at, :updated_at]).merge(
        role_name: user.role&.name,
        status: user.active? ? "active" : "inactive",
        enrolled_course_count: courses.length
      )
      ctx[:response_data] = {
        data: {
          user: user_data,
          courses: courses,
          completed_courses: courses.select { |course| course[:status] == "completed" },
          pending_courses: courses.reject { |course| course[:status] == "completed" }
        }
      }
      ctx[:status] = :ok
      true
    end

    def handle_failure(ctx, **)
      ctx[:error] ||= {
        msg: "User not found",
        status: :not_found
      }
    end
  end
end
