var mongoose = require("mongoose");
var ObjectId = mongoose.Schema.ObjectId;
var deepPopulate = require("mongoose-deep-populate")(mongoose);
var OrderSchema = mongoose.Schema({
	company: { type: ObjectId, ref: "Shop" },

	supplies: [
		{
			subProduct: { type: ObjectId, ref: "SubProduct" },
			product: { type: ObjectId, ref: "Product" },
			quantity: { type: Number, default: 0 },
			cost: { type: Number, default: 0 },
			name: { type: String },
			stocked: {type: Boolean, default: false}
		}
	],

	created_by: {
		user: { type: ObjectId, ref: "User" },
		emp: { type: ObjectId, ref: "Employee" }
	},
	created: { type: Date, default: Date.now },
	status: {
		type: String,
		enum: ["new", "shipping", "arrived", "stocked"],
		default: "new"
	}
});
OrderSchema.plugin(deepPopulate, {
	whitelist: ["created_by.user", "created_by.employee", "company"],
	populate: {
		"created_by.emp": {
			select: "_id"
		},
		"created_by.user": {
			select: "_id username first_name last_name avatar"
		}
	}
});
module.exports = mongoose.model("Order", OrderSchema);
