require "test_helper"

class LessonTest < ActiveSupport::TestCase
  test "new lessons are active by default" do
    lesson = Lesson.new

    assert_equal "active", lesson.status
  end

  test "lesson status is limited to active and inactive" do
    lesson = Lesson.new(status: "hidden")

    assert_not lesson.valid?
    assert_includes lesson.errors[:status], "is not included in the list"
  end
end
