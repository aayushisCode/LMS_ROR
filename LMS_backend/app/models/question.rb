class Question < ApplicationRecord
  before_validation :assign_question_code, on: :create
  belongs_to :category
  belongs_to :course
  belongs_to :quiz, optional: true

  has_many :options,
           class_name: "Option",
           foreign_key: :question_id,
           dependent: :restrict_with_error

  belongs_to :correct_option,
             class_name: "Option",
             foreign_key: :correct_option_id,
             optional: true

  has_many :user_options,
           foreign_key: :question_id,
           dependent: :restrict_with_error

  validates :question_text, presence: true
  validates :question_code, presence: true, uniqueness: true

  validates :question_type,
            presence: true,
            inclusion: { in: %w[mcq true_false] }

  validates :marks,
            numericality: { greater_than: 0 }

  validates :position,
            presence: true,
            numericality: { only_integer: true, greater_than: 0 },
            uniqueness: { scope: :quiz_id }, if: -> { quiz_id.present? }

  validate :correct_option_belongs_to_question
  validate :course_and_category_match_quiz

  private

  def assign_question_code
    return if question_code.present? || category.blank? || category.question_code_prefix.blank?

    Question.transaction do
      Category.lock.find(category_id)
      last = Question.where(category_id: category_id).order(Arel.sql("CAST(SUBSTRING(question_code FROM #{category.question_code_prefix.length + 2}) AS BIGINT) DESC")).first
      self.question_code = format("Q%s%03d", category.question_code_prefix, last ? last.question_code.delete_prefix("Q#{category.question_code_prefix}").to_i + 1 : 1)
    end
  end

  def correct_option_belongs_to_question
    return if correct_option_id.blank?
    return if correct_option&.question == self

    errors.add(:correct_option, "must belong to this question")
  end

  def course_and_category_match_quiz
    return unless quiz && course && category

    unless quiz.course_id == course_id
      errors.add(:course, "must match the quiz course")
    end

    unless course.category_id == category_id
      errors.add(:category, "must match the course category")
    end
  end
end
