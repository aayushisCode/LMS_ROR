
module Question::Operation
  class Update < ApplicationOperation
    step :find_question
    step :update_question

    fail :handle_failure
    step :set_response

    def find_question(ctx, params:, **)
      ctx[:model] = policy_scope_for(ctx, Question).find_by(id: params[:id])
      return false unless ctx[:model]
      authorize_record(ctx, ctx[:model], :update?)
      true
    end

    def set_response(ctx, **)
      question = ctx[:model]
      ctx[:response_data] = { data: question.as_json(
        only: [:id, :question_code, :category_id, :course_id, :quiz_id, :question_text, :question_type,
          :correct_option_id, :marks, :position, :status, :created_at, :updated_at],
        include: { options: { only: [:id, :option_text, :position] } }
      ) }
      ctx[:status] = :ok
    end

    def update_question(ctx, params:, **)
      attrs = params.require(:question).permit(:question_text, :question_type, :marks, :position, :status,
        :correct_option_position, options_attributes: [:id, :option_text, :position, :_destroy]).to_h.with_indifferent_access
      options = attrs.delete(:options_attributes)
      correct_position = attrs.delete(:correct_option_position)
      question = ctx[:model]
      expected_count = attrs.fetch(:question_type, question.question_type) == "mcq" ? 4 : 2
      if options
        positions = options.map { |option| Integer(option[:position], exception: false) }
        unless options.size == expected_count && positions.sort == (1..expected_count).to_a
          ctx[:errors] = ["#{attrs.fetch(:question_type, question.question_type)} questions must have exactly #{expected_count} options numbered 1 through #{expected_count}"]
          return false
        end
      end
      if correct_position.present?
        parsed_position = Integer(correct_position, exception: false)
        unless parsed_position
          ctx[:errors] = ["Select a valid correct option number"]
          return false
        end
        correct_position = parsed_position
      end
      if correct_position && !(1..expected_count).cover?(correct_position)
        ctx[:errors] = ["Select a valid correct option number"]
        return false
      end
      ActiveRecord::Base.transaction do
        question.update!(attrs)
        if options
          question.update!(correct_option: nil)
          submitted_ids = options.filter_map { |o| o[:id].presence }
          (question.options.pluck(:id) - submitted_ids).each { |id| question.options.find(id).destroy! }
          options.each do |o|
            if o[:_destroy].to_s == "true"
              question.options.find(o[:id]).destroy!
            elsif o[:id].present?
              question.options.find(o[:id]).update!(option_text: o[:option_text], position: o[:position])
            else
              question.options.create!(option_text: o[:option_text], position: o[:position])
            end
          end
        end
        correct = if correct_position.present?
          question.options.find_by!(position: Integer(correct_position))
        else
          question.correct_option
        end
        raise ActiveRecord::RecordInvalid, question unless correct && question.options.count == expected_count
        question.update!(correct_option: correct)
      end
      true
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotFound, ArgumentError => e
      ctx[:errors] = e.respond_to?(:record) ? e.record.errors.full_messages : ["Options and correct option are invalid"]
      false
    end

    def handle_failure(ctx, **)
      ctx[:error] = if ctx[:model].nil?
        {
          msg: "Question not found",
          status: :not_found
        }
      else
        {
          msg: ctx[:errors]&.join(", ") || "Question update failed",
          status: :unprocessable_entity
        }
      end
    end

    private

    def permitted_attributes(params, key)
      attributes = params[key] || {}
      attributes = attributes.to_unsafe_h if attributes.respond_to?(:to_unsafe_h)
      attributes = attributes.with_indifferent_access

      attributes.slice(
        :category_id,
        :course_id,
        :quiz_id,
        :question_text,
        :question_type,
        :marks,
        :position,
        :status
      )
    end
  end
end
