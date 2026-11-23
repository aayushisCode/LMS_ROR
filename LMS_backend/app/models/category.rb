class Category < ApplicationRecord
  before_validation :assign_question_code_prefix, on: :create
  has_many :courses, dependent: :restrict_with_error
  has_many :lessons, through: :courses
  has_many :lesson_pages, through: :lessons
  has_many :questions, dependent: :restrict_with_error

  validates :category_name,
            presence: true,
            uniqueness: { case_sensitive: false }
  validates :question_code_prefix, presence: true, uniqueness: true

  private

  def assign_question_code_prefix
    return if question_code_prefix.present? || category_name.blank?

    normalized_name = category_name.downcase.gsub(/[^a-z0-9]+/, " ").strip
    fixed_prefix = if ["motor", "motor insurance"].include?(normalized_name)
      "M"
    elsif ["cattle", "cattle insurance"].include?(normalized_name)
      "C1"
    elsif ["commercial", "commercial insurance"].include?(normalized_name)
      "C2"
    end
    lock_key = (fixed_prefix || normalized_name[/[a-z]/]&.upcase || "X")[0]
    Category.connection.execute("SELECT pg_advisory_xact_lock(hashtext(#{Category.connection.quote("category-prefix-#{lock_key}")}))")
    used = Category.where.not(question_code_prefix: nil).where.not(id: id).pluck(:question_code_prefix)
    if fixed_prefix && !used.include?(fixed_prefix)
      self.question_code_prefix = fixed_prefix
      return
    end

    initial = normalized_name[/[a-z]/]&.upcase || "X"
    reserved = %w[M C1 C2]
    candidate = initial
    suffix = 1
    while used.include?(candidate) || reserved.include?(candidate)
      candidate = "#{initial}#{suffix}"
      suffix += 1
    end
    self.question_code_prefix = candidate
  end
end
