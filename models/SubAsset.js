var mongoose = require("mongoose");
var ObjectId = mongoose.Schema.ObjectId;
var deepPopulate = require("mongoose-deep-populate")(mongoose);
var SubAssetSchema = mongoose.Schema({
    slug: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    company: { type: ObjectId, ref: "Company" },
    asset: { type: ObjectId, ref: "Asset" },
    created_by: {
        user: { type: ObjectId, ref: "User" },
        emp: { type: ObjectId, ref: "Employee" }
    },
    created: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "delete"], default: "active" }
});
SubAssetSchema.plugin(deepPopulate, {
    whitelist: ["created_by.user", "created_by.employee", "asset", "company"],
    populate: {
        "created_by.emp": {
            select: "_id"
        },
        "created_by.user": {
            select: "_id username first_name last_name avatar"
        },
        company: {
            select: "_id name"
        },
        asset: {
            select: "_id title slug"
        }
    }
});
module.exports = mongoose.model("SubAsset", SubAssetSchema);
