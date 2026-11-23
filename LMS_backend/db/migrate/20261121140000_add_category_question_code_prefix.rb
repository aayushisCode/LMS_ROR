class AddCategoryQuestionCodePrefix < ActiveRecord::Migration[8.1]
  def up
    add_column :categories, :question_code_prefix, :string
    Category.reset_column_information

    prefixes = {}
    used = []
    reserved = %w[M C1 C2]
    Category.order(:created_at, :id).each do |category|
      name = category.category_name.downcase.gsub(/[^a-z0-9]+/, " ").strip
      prefix = if ["motor", "motor insurance"].include?(name)
        "M"
      elsif ["cattle", "cattle insurance"].include?(name)
        "C1"
      elsif ["commercial", "commercial insurance"].include?(name)
        "C2"
      end
      prefix = nil if prefix && used.include?(prefix)
      unless prefix
        initial = name[/[a-z]/]&.upcase || "X"
        prefix = initial
        suffix = 1
        while used.include?(prefix) || reserved.include?(prefix)
          prefix = "#{initial}#{suffix}"
          suffix += 1
        end
      end
      raise "Duplicate question code prefix #{prefix}" if used.include?(prefix)
      used << prefix
      prefixes[category.id] = prefix
      Category.where(id: category.id).update_all(question_code_prefix: prefix)
    end

    Question.reset_column_information
    Question.find_each { |question| Question.where(id: question.id).update_all(question_code: "TMP#{question.id.delete('-')}") }
    prefixes.each do |category_id, prefix|
      Question.where(category_id: category_id).order(:created_at, :id).each_with_index do |question, index|
        Question.where(id: question.id).update_all(question_code: format("Q%s%03d", prefix, index + 1))
      end
    end

    change_column_null :categories, :question_code_prefix, false
    add_index :categories, :question_code_prefix, unique: true
  end

  def down
    remove_index :categories, :question_code_prefix
    remove_column :categories, :question_code_prefix
  end
end
