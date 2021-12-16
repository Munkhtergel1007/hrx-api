var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.ObjectId;
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var AssetSchema = mongoose.Schema({
    slug: {type: String, unique: true, required : true},
    title: {type: String, required : true},
    company: {type: ObjectId, ref: 'Company'},
    created_by: {user:{type: ObjectId, ref: 'User', default: null}, emp: {type: ObjectId, ref: 'Employee', default: null}},
    created: {type:Date, default: Date.now},
    status: {type: String, enum: ['active', 'delete'], default: 'active'},
});
AssetSchema.plugin(deepPopulate, {
    whitelist: ['created_by.user','created_by.employee','company'],
    populate: {
        'created_by.emp':{
            select:'_id'
        },
        'company':{
            select:'_id name'
        },
        'created_by.user':{
            select:'_id username first_name last_name avatar'
        },
    }
});
module.exports = mongoose.model('Asset', AssetSchema);