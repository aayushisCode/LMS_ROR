
module User::Operation
  class Index < ApplicationOperation
    step :fetch_users
    fail :handle_failure

    def fetch_users(ctx, **)
      authorize_record(ctx, User, :index?)

      users = policy_scope_for(ctx, User).includes(:role, :user_courses)

      ctx[:response_data] = {
        data: users.map do |user|
          user.as_json(
            only: [
              :id,
              :name,
              :email,
              :active,
              :role_id,
              :created_at,
              :updated_at
            ]
          ).merge(
            role_name: user.role&.name,
            status: user.active? ? "active" : "inactive",
            enrolled_course_count: user.user_courses.size
          )
        end
      }

      ctx[:status] = :ok
      true
    rescue StandardError => e
      Rails.logger.error("User Index Error: #{e.full_message}")
      false
    end

    def handle_failure(ctx, **)
      ctx[:error] ||= {
        msg: "Unable to fetch users",
        status: :internal_server_error
      }
    end
  end
end
