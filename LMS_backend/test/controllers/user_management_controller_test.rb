require "test_helper"

class UserManagementControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin_role = Role.create!(name: "admin")
    @learner_role = Role.create!(name: "learner")
    @admin = create_user("admin", @admin_role)
    @learner = create_user("learner", @learner_role)
    @admin_token = login_as(@admin)
  end

  test "lists users with active state and enrolled course count" do
    category = Category.create!(category_name: "Safety", description: "Safety courses")
    course = Course.create!(category: category, title: "Safe driving", status: "published")
    UserCourse.create!(user: @learner, course: course, assigned_by: @admin)

    get "/api/users", headers: bearer(@admin_token)

    assert_response :ok
    learner = response.parsed_body.fetch("data").find { |record| record.fetch("id") == @learner.id }
    assert_equal "learner@example.com", learner.fetch("email")
    assert_equal true, learner.fetch("active")
    assert_equal 1, learner.fetch("enrolled_course_count")
  end

  test "shows user profile with course progress grouped into completed and pending" do
    category = Category.create!(category_name: "Safety", description: "Safety courses")
    completed_course = Course.create!(category: category, title: "Safe driving", status: "published")
    pending_course = Course.create!(category: category, title: "Road rules", status: "published")
    UserCourse.create!(user: @learner, course: completed_course, assigned_by: @admin, status: "completed", progress_percentage: 100)
    UserCourse.create!(user: @learner, course: pending_course, assigned_by: @admin, status: "in_progress", progress_percentage: 35)

    get "/api/users/#{@learner.id}", headers: bearer(@admin_token)

    assert_response :ok
    data = response.parsed_body.fetch("data")
    assert_equal @learner.id, data.fetch("user").fetch("id")
    assert_equal 2, data.fetch("user").fetch("enrolled_course_count")
    assert_equal ["Safe driving"], data.fetch("completed_courses").map { |course| course.fetch("title") }
    assert_equal 35, data.fetch("pending_courses").first.fetch("progress_percentage")
  end

  test "admin can deactivate and reactivate a user while rotating the JWT identifier" do
    previous_jti = @learner.jti

    patch "/api/users/#{@learner.id}/status", params: { active: false }, headers: bearer(@admin_token), as: :json

    assert_response :ok
    assert_equal false, response.parsed_body.dig("data", "active")
    @learner.reload
    assert_not @learner.active?
    assert_not_equal previous_jti, @learner.jti

    patch "/api/users/#{@learner.id}/status", params: { active: true }, headers: bearer(@admin_token), as: :json
    assert_response :ok
    assert @learner.reload.active?
  end

  test "inactive users cannot sign in or use a previously issued token" do
    learner_token = login_as(@learner)
    patch "/api/users/#{@learner.id}/status", params: { active: false }, headers: bearer(@admin_token), as: :json
    assert_response :ok

    get "/api/courses", headers: bearer(learner_token)
    assert_response :unauthorized

    post "/users/sign_in", params: { user: { email: @learner.email, password: "password123" } }, as: :json
    assert_response :unauthorized
  end

  test "non-admin users cannot change account status" do
    learner_token = login_as(@learner)

    patch "/api/users/#{@admin.id}/status", params: { active: false }, headers: bearer(learner_token), as: :json

    assert_response :forbidden
    assert @admin.reload.active?
  end

  private

  def create_user(label, role)
    User.create!(
      name: label.capitalize,
      email: "#{label}@example.com",
      password: "password123",
      password_confirmation: "password123",
      address: "Test address",
      contact: "+1 555 123 4567",
      role: role
    )
  end

  def login_as(user)
    post "/users/sign_in", params: { user: { email: user.email, password: "password123" } }, as: :json
    assert_response :ok
    response.headers.fetch("Authorization").split.last
  end

  def bearer(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
