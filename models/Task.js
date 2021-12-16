let mongoose = require("mongoose");
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require("mongoose-deep-populate")(mongoose);

const TaskSchema = mongoose.Schema({
	company: { type: ObjectId, ref: "Company" },
	owner: {
		emp: { type: ObjectId, ref: "Employee" },
		user: { type: ObjectId, ref: "User" }
	},
	employees: [
		{
			emp: { type: ObjectId, ref: "Employee" },
			user: { type: ObjectId, ref: "User" }
		}
	],
	title: String,
	description: String,
	dates: [{ type: Date }],
	tag: { type: ObjectId, ref: "SubTag" },
	price: Number,
	image: { type: ObjectId, ref: "Media" },
	list: [
		{
			employee: {
				emp: { type: ObjectId, ref: "Employee" },
				user: { type: ObjectId, ref: "User" }
			},
			text: String,
			date: Date,
			status: Boolean,
		}
	],
	status: {
		type: String,
		enum: ["delete", "doing", "done", "finished", "declined"],
		default: "doing"
	},
	created: { type: Date, default: Date.now },
	finished: Date
});

TaskSchema.plugin(deepPopulate, {
	whitelist: [
		"owner.user",
		"owner.emp",
		"tag",
		"employees.user",
		"employees.emp",
		"owner.user.avatar",
        "employees.user.avatar"
	],
	populate: {
		"owner.user": {
			select: "_id first_name last_name register_id"
		},
		"owner.emp": {
			select: "_id staticRole"
		},
		"employees.user": {
			select: "_id first_name last_name register_id"
		},
		"employees.emp": {
			select: "_id staticRole"
		},
		tag: {
			select: "_id title desc"
		},
        "owner.user.avatar": {
            select: "_id path original_name"
        },
        "employees.user.avatar": {
            select: "_id path original_name"
        },
	}
});

module.exports = mongoose.model("Task", TaskSchema);
