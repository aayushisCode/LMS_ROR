class AddStatusToLessons < ActiveRecord::Migration[8.1]
  def change
    add_column :lessons, :status, :string, null: false, default: "active"
    add_check_constraint :lessons, "status IN ('active', 'inactive')", name: "lessons_valid_status"
    add_index :lessons, :status
  end
end
