let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const Admin = mongoose.Schema({
    username: {type: String, required: true, unique: true},
    status: {type: String, enum: ["active", "delete"], default: "active"},
    password: {type: String, required: true},
    avatar: {type: ObjectId, ref: 'Media'},
    created: {type: Date, default: Date.now}
});

Admin.plugin(deepPopulate, {
    whitelist: ["avatar"],
    populate: {
        avatar: {
            select: '_id path url'
        }
    }
});

module.exports = mongoose.model('Admin', Admin);