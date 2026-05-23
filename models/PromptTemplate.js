const mongoose = require("mongoose");

const PromptTemplate = mongoose.model(
  "PromptTemplate",
  new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,

      name: {
        type: String,
        required: true,
        maxlength: 100,
      },

      description: {
        type: String,
        maxlength: 500,
      },

      category: {
        type: String,
        maxlength: 50,
      },

      prompt: {
        type: String,
        required: true,
        maxlength: 10000,
      },

      variables: [String],

      tags: [String],

      isFavorite: {
        type: Boolean,
        default: false,
      },
    },
    { timestamps: true },
  ),
);

module.exports = PromptTemplate;