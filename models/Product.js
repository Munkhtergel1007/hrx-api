let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const ProductSchema = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    assets: [{type: ObjectId, ref: 'Asset'}],
    category: {type: ObjectId, ref: 'Category'},
    subCategory: {type: ObjectId, ref: 'SubCategory'},
    title: String,
    status: {type: String, enum: ['active', 'delete'], default: 'active'},
    created: {type: Date, default: Date.now},
});
ProductSchema.plugin(deepPopulate, {
    whitelist: ["company", "assets", "category", "subCategory"],
    populate: {
        "company": {
            select: "_id name"
        },
        "assets": {
            select: "_id title company"
        },
        "category": {
            select: "_id title company"
        },
        "subCategory": {
            select: "_id title category company"
        }
    }
});
module.exports = mongoose.model('Product', ProductSchema);