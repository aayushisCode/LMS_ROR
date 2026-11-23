class AllowUnassignedQuestions < ActiveRecord::Migration[8.1]
  def change
    remove_index :questions, [:quiz_id, :position]
    change_column_null :questions, :quiz_id, true
    change_column_null :questions, :position, true
    add_index :questions, [:quiz_id, :position], unique: true, where: "quiz_id IS NOT NULL", name: "index_questions_on_quiz_id_and_position"
  end
end
