let mongoose = require("mongoose");
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require("mongoose-deep-populate")(mongoose);

const SubProductSchema = mongoose.Schema({
    company: { type: ObjectId, ref: "Company" },
    subAssets: [{ type: ObjectId, ref: "SubAsset" }],
    product: { type: ObjectId, ref: "Product" },
    status: {
        type: String,
        enum: ["active", "pending", "delete"],
        default: "active"
    },
    created: { type: Date, default: Date.now },
    price: Number,
    designation: String
});
SubProductSchema.plugin(deepPopulate, {
    whitelist: ["company", "subAssets", "product"],
    populate: {
        company: {
            select: "_id name"
        },
        subAssets: {
            select: "_id title asset"
        },
        product: {
            select: "_id title company category subCategory assets"
        }
    }
});
module.exports = mongoose.model("SubProduct", SubProductSchema);
