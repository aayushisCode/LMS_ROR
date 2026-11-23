class AddQuestionCode < ActiveRecord::Migration[8.1]
  def up
    add_column :questions, :question_code, :string
    Question.reset_column_information
    prefixes = {}
    used = []
    reserved = %w[M C1 C2]
    Category.order(:created_at, :id).each do |category|
      name = category.category_name.downcase.gsub(/[^a-z0-9]+/, " ").strip
      preferred = if ["motor", "motor insurance"].include?(name)
        "M"
      elsif ["cattle", "cattle insurance"].include?(name)
        "C1"
      elsif ["commercial", "commercial insurance"].include?(name)
        "C2"
      end
      prefix = preferred unless preferred && used.include?(preferred)
      unless prefix
        initial = name[/[a-z]/]&.upcase || "X"
        prefix = initial
        suffix = 1
        while used.include?(prefix) || reserved.include?(prefix)
          prefix = "#{initial}#{suffix}"
          suffix += 1
        end
      end
      used << prefix
      prefixes[category.id] = prefix
    end
    prefixes.each do |category_id, prefix|
      Question.where(category_id: category_id).order(:created_at, :id).each_with_index do |question, index|
        Question.where(id: question.id).update_all(question_code: format("Q%s%03d", prefix, index + 1))
      end
    end
    change_column_null :questions, :question_code, false
    add_index :questions, :question_code, unique: true
  end

  def down
    remove_index :questions, :question_code
    remove_column :questions, :question_code
  end
end
