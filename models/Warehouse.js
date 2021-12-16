var mongoose = require("mongoose");
var ObjectId = mongoose.Schema.ObjectId;
var deepPopulate = require("mongoose-deep-populate")(mongoose);
var WarehouseSchema = mongoose.Schema({
	title: { type: String, required: true },
	company: { type: ObjectId, ref: "Shop" },
	created_by: {
		user: { type: ObjectId, ref: "User" },
		emp: { type: ObjectId, ref: "Employee" }
	},
	created: { type: Date, default: Date.now },
	status: { type: String, enum: ["active", "delete"], default: "active" },
	employees: [{
		user: { type: ObjectId, ref: "User" },
		emp: { type: ObjectId, ref: "Employee" }
	}]
});
WarehouseSchema.plugin(deepPopulate, {
	whitelist: ["created_by.user", "created_by.employee", "company", 'employees.user', 'employees.emp'],
	populate: {
		"created_by.emp": {
			select: "_id"
		},
		"created_by.user": {
			select: "_id username first_name last_name avatar"
		},
		"employees.emp": {
			select: "_id staticRole"
		},
		"employees.user": {
			select: "_id first_name last_name register_id"
		}
	}
});
module.exports = mongoose.model("Warehouse", WarehouseSchema);
