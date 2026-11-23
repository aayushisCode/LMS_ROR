# Be sure to restart the server when this file changes.

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:5173"

    resource "*",
      headers: ["Authorization", "Content-Type", "Accept"],
      methods: %i[get post put patch delete options head],
      expose: ["Authorization"],
      max_age: 600
  end
end
