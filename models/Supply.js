var mongoose = require("mongoose");
var ObjectId = mongoose.Schema.ObjectId;
var deepPopulate = require("mongoose-deep-populate")(mongoose);
var SupplySchema = mongoose.Schema({
    company: { type: ObjectId, ref: "Company" },
    warehouse: { type: ObjectId, ref: "Warehouse" },
    subProduct: { type: ObjectId, ref: "SubProduct" },
    product: { type: ObjectId, ref: "Product" },
    order: { type: ObjectId, ref: "Order" },
    cost: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 }, //Uruuchlugduh too hemjee
    quantity_initial: { type: Number, default: 0 }, //Uurchluhgui too hemjee
    created_by: {
        user: { type: ObjectId, ref: "User" },
        emp: { type: ObjectId, ref: "Employee" }
    },
    created: { type: Date, default: Date.now },
    type: { type: String, enum: ["order", "warehouse"], default: "order" },
    status: { type: String, enum: ["active", "soldOut"], default: "active" },
    parent_sell : {type: ObjectId, ref: "Sell"} //Ymr sellnees orj irsen
});
SupplySchema.plugin(deepPopulate, {
    whitelist: [
        "created_by.user",
        "created_by.employee",
        "company",
        "order",
        "subProduct",
        "product",
		"subProduct.subAssets"
    ],
    populate: {
        "created_by.emp": {
            select: "_id"
        },
        "created_by.user": {
            select: "_id username first_name last_name avatar"
        },
        "order": {
            select: "_id supplies created"
        },
        "subProduct": {
            select: "_id subAssets"
        },
		"subProduct.subAssets": {
			select: "_id title"
		}
    }
});
module.exports = mongoose.model("Supply", SupplySchema);
