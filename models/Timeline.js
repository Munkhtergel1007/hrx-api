let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let TimelineSchema = mongoose.Schema({
    // lesson: {type: ObjectId, ref: 'Lesson'},
    employee: {type: ObjectId, ref: 'Employee'},
    company: {type: ObjectId, ref: 'Company'},
    title: {type: String, required: true},
    description: String,
    type: {type: String, enum: ['content', 'video', 'audio', 'pdf']},
    content: String,
    video: {type: ObjectId, ref: 'Media'},
    audio: {type: ObjectId, ref: 'Media'},
    pdf: {type: ObjectId, ref: 'Media'},
    zip: {type: ObjectId, ref: 'Media'},
    minutes: Number,
    created: {type:Date, default: Date.now},
    status: {type: String, enum: ['active', 'delete'], default: 'active'},
});
TimelineSchema.plugin(deepPopulate, {
    whitelist: ['zip', 'audio', "video", 'employee', 'employee.user', 'pdf', 'lesson'],
    populate: {
        'employee':{
            select:'_id user'
        },
        'employee.user':{
            select:'_id last_name first_name username avatar'
        },
        'audio':{
            select:'_id path thumbnail type original_name'
        },
        'zip':{
            select:'_id path thumbnail type original_name'
        },
        'video':{
            select:'_id path thumbnail type original_name'
        },
        'pdf':{
            select:'_id path thumbnail type original_name'
        },
    }
});
module.exports = mongoose.model('Timeline', TimelineSchema);
