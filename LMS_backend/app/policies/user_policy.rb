class UserPolicy < ApplicationPolicy
  def index? = admin?
  def show? = admin? || (learner? && record.id == user.id)
  def create? = admin?
  def update? = admin?
  def update_status? = admin?
  def destroy? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.all if admin?
      learner? ? scope.where(id: user.id) : scope.none
    end
  end
end
