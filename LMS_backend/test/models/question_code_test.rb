require "test_helper"

class QuestionCodeTest < ActiveSupport::TestCase
  test "generates stable category-based codes for categories with shared initials" do
    motor = Category.create!(category_name: "Motor")
    cattle = Category.create!(category_name: "Cattle")
    commercial = Category.create!(category_name: "Commercial")
    courses = [motor, cattle, commercial].map.with_index do |category, index|
      Course.create!(category: category, title: "Course #{index}")
    end

    codes = [motor, cattle, commercial].zip(courses).map do |category, course|
      Question.create!(category: category, course: course, question_text: "Question", question_type: "mcq", marks: 1).question_code
    end

    assert_equal ["QM001", "QC1001", "QC2001"], codes
  end

  test "allocates a unique persistent identifier for categories with identical initials" do
    first = Category.create!(category_name: "Regional")
    second = Category.create!(category_name: "Rural")

    assert_not_equal first.question_code_prefix, second.question_code_prefix
    assert_equal first.question_code_prefix, first.reload.question_code_prefix
  end
end
