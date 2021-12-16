var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.ObjectId;
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var LessonSchema = mongoose.Schema({
    user: {type: ObjectId, ref: 'User'},
    lessonPublish: {type: ObjectId, ref: 'LessonPublish'},
    title: {type: String, required: true},
    slug: {type: String, unique: true, required : true},
    description: String, // bogino hemjeenii tailbar
    rating: [{
        user: {type: ObjectId, ref: 'User'},
        rate: Number,
        comment: String
    }], // -#- huuchin
    progress: [{
        user: {type: ObjectId, ref: 'User'},
        updated: {type:Date, default: Date.now},
        progress: Number
    }], // -#- huuchin
    teacher: {type: ObjectId, ref: 'Employee'},
    category: {type: ObjectId, ref: 'Category'},
    lvl: {type: String, enum:['elementary', 'intermediate', 'advanced'], default:'elementary'},
    price: {type: Number, default: 0},
    sale: {type: Number, default: 0},
    levels: [{
        programs: [{
            timeline: {type: ObjectId, ref: 'Timeline'},
            passed_users: [{type: ObjectId, ref: 'User'}] // -#- huuchin
        }],
        title: {type: String, required: true}
    }],
    views: {type: Number, default: 0},
    featured: {type: Boolean, default: false},
    thumbnail: {type: ObjectId, ref: 'Media'},
    thumbnailSmall: {type: ObjectId, ref: 'Media'},
    thumbVideo: {type: ObjectId, ref: 'Media'},
    requirements: [{type:String}],
    learn_check_list: [{type:String}],
    intro_desc: String, // hicheeliin delgrengui taniltsuulaga
    purchase_count: {type: Number, default: 0},
    created: {type:Date, default: Date.now}, // -#- huuchin
    updated: {type:Date, default: Date.now}, // -#- uurchil
    status: {type: String, enum: ['active', 'delete', 'banned'], default:'active'},
    publish: {type:String, enum: ['new', 'pending', 'publish'], default:'pending'}
});
LessonSchema.plugin(deepPopulate, {
    whitelist: ['lessonPublish', 'category', 'teacher', 'thumbnail', 'thumbnailSmall', "thumbVideo", 'levels.programs.timeline', 'levels.programs.timeline.video', 'levels.programs.timeline.audio', 'levels.programs.timeline.pdf'],
    populate: {
        'lessonPublish':{
            select:'_id status publish'
        },
        'teacher':{
            select:'_id username first_name last_name phone avatar type'
        },
        'category':{
            select:'_id slug title parent avatar'
        },
        'thumbnail':{
            select:'_id path type thumb original_name'
        },
        'thumbnailSmall':{
            select:'_id path type thumb original_name'
        },
        'thumbVideo':{
            select:'_id path type thumb original_name'
        },
        'levels.programs.timeline':{
            select:'_id title created minutes type description video video content include_zip pdf'
        },
        'levels.programs.timeline.video':{
            select:'_id path thumb type original_name url'
        },
        'levels.programs.timeline.audio':{
            select:'_id path thumb type original_name url'
        },
        'levels.programs.timeline.pdf':{
            select:'_id path type url'
        },
    }
});
module.exports = mongoose.model('Lesson', LessonSchema);
