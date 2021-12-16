var mongoose = require("mongoose");
var ObjectId = mongoose.Schema.ObjectId;
var deepPopulate = require("mongoose-deep-populate")(mongoose);
var SellSchema = mongoose.Schema({
    company: { type: ObjectId, ref: "Shop" },
    warehouse: { type: ObjectId, ref: "Warehouse" },
    warehouseGiven: { type: ObjectId, ref: "Warehouse" }, //Haashaa ugsun ni
    subProduct: { type: ObjectId, ref: "SubProduct" },
    product: { type: ObjectId, ref: "Product" },
    supply: { type: ObjectId, ref: "Supply" },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    created_by: {
        user: { type: ObjectId, ref: "User" },
        emp: { type: ObjectId, ref: "Employee" }
    },
    paidType: { type: String, enum: ["bill", "card", "bankAccount", "bankAccountOther", "loan"] },
    type: {
        type: String,
        enum: ["sold", "given", "interGiven", "interTaken"],
        default: "sold"
    },
    description: String,
    priceGot: Number,
    priceSold: Number,
    employee: {
        user: { type: ObjectId, ref: "User" },
        emp: { type: ObjectId, ref: "Employee" },
        type: { type: String, enum: ["sold", "dealt", "finished"] }
    },
    created: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ["active", "delete", "pending", "declined"],
        default: "active"
    }
});
SellSchema.plugin(deepPopulate, {
    whitelist: [
        "created_by.user",
        "created_by.employee",
        "subProduct",
        "subProduct.subAssets",
        "product",
        "supply"
    ],
    populate: {
        "created_by.emp": {
            select: "_id"
        },
        "created_by.user": {
            select: "_id username first_name last_name avatar"
        },
        subProduct: {
            select: "_id subAssets"
        },
        "subProduct.subAssets": {
            select: "_id title"
        },
        product: {
            select: "_id title"
        }
    }
});
module.exports = mongoose.model("Sell", SellSchema);
