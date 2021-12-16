let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let CategoryRequestSchema = mongoose.Schema({
    employee: {type: ObjectId, ref: 'Employee'},
    description: {type: String, default: ''},
    child: {type: String, default: ''},
    reply: {type: String, default: ''},
    // parent: {type: String, default: ''},
    created: {type:Date, default: Date.now},
    status: {type: String, enum: ['active', 'delete'], default: 'active'},
    progress: {type: String, enum: ['pending', 'ongoing', 'done'], default: 'pending'},
});
CategoryRequestSchema.plugin(deepPopulate, {
    whitelist: ['employee'],
    populate: {
        'employee':{
            select:'_id first_name last_name username avatar'
        }
    }
});
module.exports = mongoose.model('CategoryRequest', CategoryRequestSchema);