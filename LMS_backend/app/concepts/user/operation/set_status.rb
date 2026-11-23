module User::Operation
  class SetStatus < ApplicationOperation
    step :find_user
    step :set_status
    fail :handle_failure

    def find_user(ctx, params:, **)
      ctx[:model] = policy_scope_for(ctx, User).find_by(id: params[:id])
      return false unless ctx[:model]

      authorize_record(ctx, ctx[:model], :update_status?)
      true
    end

    def set_status(ctx, params:, **)
      value = params.permit(:active)[:active]
      active = case value
      when true, "true", "1" then true
      when false, "false", "0" then false
      else
        ctx[:error] = { msg: "Active must be true or false", status: :unprocessable_entity }
        return false
      end

      user = ctx[:model]
      unless user.update(active: active, jti: SecureRandom.uuid)
        ctx[:error] = { msg: "Unable to update user status", status: :unprocessable_entity }
        return false
      end

      ctx[:response_data] = {
        data: {
          id: user.id,
          active: user.active?,
          status: user.active? ? "active" : "inactive"
        }
      }
      ctx[:status] = :ok
      true
    end

    def handle_failure(ctx, **)
      ctx[:error] ||= { msg: "User not found", status: :not_found }
    end
  end
end
