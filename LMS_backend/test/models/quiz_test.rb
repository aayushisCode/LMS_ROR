require "test_helper"

class QuizTest < ActiveSupport::TestCase
  test "lesson quiz cannot reference a lesson from another course" do
    category = Category.create!(category_name: "Quiz Test Category")
    course = Course.create!(category: category, title: "Course A")
    other_course = Course.create!(category: category, title: "Course B")
    lesson = Lesson.create!(course: other_course, title: "Lesson B", position: 1)

    quiz = Quiz.new(course: course, lesson: lesson, title: "Lesson quiz", quiz_type: "lesson", pass_marks: 1)

    assert_not quiz.valid?
    assert_includes quiz.errors[:lesson], "must belong to the selected course"
  end
end
