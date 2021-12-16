import winston from 'winston';
import async from 'async';
import auth from "../auth";
import Media from "../models/Media";
import Lesson from "../models/Lesson";
import LessonPublish from "../models/LessonPublish";
import Timeline from "../models/Timeline";
import Category from "../models/Category";
import User from "../models/User";
import locale from "../lang";

module.exports = function (router) {
    router.post('/recycle/media',auth.user,function(req , res){
        Media.findOne({_id:req.body._id, forWhat:{$ne:'copy'}}, function (err, data) {
            if (err) {
                winston.error('/recycle/media', err);
                return res.status(200).json({success:false,msg: locale("system_err"), _id:req.body._id});
            }
            if(data){
                if( req.user.role === 'admin' || (req.user && (req.user._id || 'aa').toString() === (data.user || 'bb').toString()) ){
                    // if(data.type && data.type === 'video'){
                    let lessonQuery = [{status:'active'}];
                    let timelineQuery = [];
                    if(data.type === 'video'){
                        lessonQuery = [...lessonQuery, {video:data._id}];
                        timelineQuery = [...timelineQuery, {video:data._id}];
                    } else if(data.type === 'audio'){
                        lessonQuery = [...lessonQuery, {video:data._id}]; // ugiin audio hadgaldggue
                        timelineQuery = [...timelineQuery, {audio:data._id}];
                    } else if(data.type === 'image'){
                        lessonQuery = [...lessonQuery, {$or: [ {thumbnail:data._id} , {thumbnailSmall:data._id} ]}];
                        timelineQuery = [...timelineQuery, {video:data._id}]; // ugiin image hadgaldggue
                    } else if(data.type === 'file'){
                        lessonQuery = [...lessonQuery, {video:data._id}]; // ugiin file hadgaldggue
                        timelineQuery = [...timelineQuery, {include_zip:data._id}];
                    } else if(data.type === 'pdf'){
                        lessonQuery = [...lessonQuery, {video:data._id}]; // ugiin file hadgaldggue
                        timelineQuery = [...timelineQuery, {pdf:data._id}];
                    }
                        async.parallel([
                            function (callback) {
                                Lesson.find({$and:[...lessonQuery]}, {_id:1, title:1, slug:1}).lean().exec( function(err,result) {
                                    callback(err, result)
                                });
                            },
                            function (callback) {
                                Timeline.find({$and:[...timelineQuery]}, {_id:1, title:1, lesson:1})
                                    // .deepPopulate(['lesson'])
                                    .lean()
                                    .exec( function(err,result) {
                                    // callback(err, result)
                                    Lesson.find({status:'active', levels:{$elemMatch:{programs:{$elemMatch:{timeline:{$in:(result || []).map(r => r._id)}}}}}}, {_id:1, title:1, levels:1, slug:1})
                                        .deepPopulate(['levels.programs.timeline'])
                                        .lean()
                                        .exec( function(err,result) {
                                        callback(err, result)
                                    });
                                });
                            },
                            function (callback) {
                                LessonPublish.find({$and:[...lessonQuery]}, {_id:1, title:1, slug:1}).lean().exec( function(err,result) {
                                    callback(err, result)
                                });
                            },
                            function (callback) {
                                Timeline.find({$and:[...timelineQuery]}, {_id:1, title:1, lesson:1})
                                // .deepPopulate(['lesson'])
                                    .lean()
                                    .exec( function(err,result) {
                                        // callback(err, result)
                                        LessonPublish.find({status:'active', levels:{$elemMatch:{programs:{$elemMatch:{timeline:{$in:(result || []).map(r => r._id)}}}}}}, {_id:1, title:1, levels:1, slug:1})
                                            .deepPopulate(['levels.programs.timeline'])
                                            .lean()
                                            .exec( function(err,result) {
                                                callback(err, result)
                                            });
                                    });
                            },
                        ],function (err, results) {
                            if(err){
                                winston.error('/recycle/media', err);
                                return res.status(200).json({success:false, msg: locale("system_err"), _id:req.body._id, err});
                            }
                            if((results[0] || []).length>0 || (results[1] || []).length>0 || (results[2] || []).length>0 || (results[3] || []).length>0){
                                return res.status(200).json({success:true, _id:data._id, lessons:(results[0] || []), timelines:(results[1] || []), lessonPublishes:(results[2] || []), timelineLessonPublishes:(results[3] || []) });
                            } else {
                                data.status = 'recycled';
                                data.save(function (err, esd) {
                                    if (err) {
                                        winston.error('/recycle/media', err);
                                        return res.status(200).json({success:false,msg: locale("system_err"), _id:req.body._id});
                                    }
                                    return res.status(200).json({success:true, _id:data._id, sucmod:true, msg:locale("success") });
                                });
                            }
                        })
                    // } else {
                    //     return res.status(200).json({success:false,msg: 'Хөгжүүлэлт хийгдэж байна!', _id:req.body._id});
                    // }
                } else {
                    return res.status(200).json({success:false,msg: locale("role_insufficient"),_id:req.body._id});
                }
            } else {
                return res.status(200).json({success:false,msg: locale("error"), _id:req.body._id});
            }
        })
    });
    router.post('/restore/media',auth.user,function(req , res){
        Media.findOne({_id:req.body._id}, function (err, data) {
            if (err) {
                winston.error('/recycle/media', err);
                return res.status(200).json({success:false,msg: locale("system_err"), _id:req.body._id});
            }
            if(data){
                if( req.user.role === 'admin' || (req.user && (req.user._id || 'aa').toString() === (data.user || 'bb').toString()) ){
                    data.status = 'active';
                    data.save(function (err, esd) {
                        if (err) {
                            winston.error('/restore/media', err);
                            return res.status(200).json({success:false,msg: locale("system_err"), _id:req.body._id});
                        }
                        return res.status(200).json({success:true, _id:data._id, sucmod:true, msg:locale("success") });
                    });
                } else {
                    return res.status(200).json({success:false,msg: locale("role_insufficient"),_id:req.body._id});
                }
            } else {
                return res.status(200).json({success:false,msg: locale("error"), _id:req.body._id});
            }
        })
    });


    router.post('/get/media/:type/:num',auth.user,function(req , res){
        const {type, num} = req.params;
        const forWhat = req.body.forWhat;
        let selection = {thumbnail: 1, _id: 1, original_name: 1,created: 1, duration: 1, type: 1};
        let nm = parseInt(num) || 0;
        let query = [ {type:type} , {status:'active'} ];
        if(forWhat && forWhat==="avatar"){
            query.push({user: (req.user || {})._id});
        } else {
            query.push({company: (req.company || {})._id});
        }
        if(type=="image"){
            selection = {...selection,path:1};
            query.push({forWhat:forWhat});
        }
        if(req.body.name){
            query.push({original_name: { "$regex": req.body.name, "$options": "i" }});
        }
        if(req.body.ids && (req.body.ids || []).length > 0){
            query.push({_id: { $nin: req.body.ids}});
        }
        if(req.body.year){
            let month = parseInt(req.body.month || new Date().getMonth());
            let start = new Date(req.body.year , month);
            let end = new Date(month < 11 ? req.body.year : parseInt(req.body.year) + 1 ,  month < 11 ? month + 1 : 0);
            query.push({created: {$lte : end, $gt : start}});
        }
        Media.find({$and:[...query]}, selection).sort({created: -1}).skip(nm * 50).limit(50).exec(function(err , media){
            if(err){
                winston.error('/get/media/:type/:num',err);
                return res.json({success:false,msg: locale("system_err")});
            } else if(media){
                return res.json({success:true , media,type,num: nm,search: req.body.search});
            } else {
                return res.json({success:false , media: []});
            }
        })
    })
    router.post('/get/info/media/:type',auth.user,function(req , res){
        const {type} = req.params;
        const forWhat = req.body.forWhat;
        let query = {$and: [ {type}, {status:'active'} , {$or: [{to: {$exists: false}}, {to: {$eq: null}}]}]};
        let quQu = {};
        if(forWhat && forWhat==="avatar"){
            quQu = {user: (req.user || {})._id};
        } else {
            quQu = {company: (req.company || {})._id};
        }
        if(req.body.name){
            query = {...query, $and: [...query["$and"], {original_name: { "$regex": req.body.name, "$options": "i" }}]}
        }
        if(req.body.ids && (req.body.ids || []).length > 0){
            query = {...query, $and: [...query["$and"], {_id: { $nin: req.body.ids}}]}
        }
        if(req.body.year){
            let month = parseInt(req.body.month || new Date().getMonth());
            let start = new Date(req.body.year , month);
            let end = new Date(month < 11 ? req.body.year : parseInt(req.body.year) + 1 ,  month < 11 ? month + 1 : 0);
            query = {...query, $and: [...query["$and"],
                    {created: {$lte : end, $gt : start}},
                ]}
        }
        async.parallel([
            function(callback){
                Media.aggregate([
                    {
                        $match: {$and: [quQu , {type}, {status:'active'} , {$or: [{to: {$exists: false}}, {to: {$eq: null}}]}]}
                    },
                    {
                        $project: {
                            created: {
                                year: { $dateToString: { format: "%Y", date: "$created" } },
                                month: {$dateToString: { format: "%m", date: "$created" }},
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$created.year",
                            month: {
                                $addToSet: "$created.month"
                            }
                        }
                    }
                ],function(err,data){
                    data = (data || []).map((m) => {
                        m.month.sort((a,b)=>{return b - a});
                        return m;
                    });
                    callback(err,data)
                })
            },
            function(callback){
                Media.find(query).count().exec((err,data)=>{
                    callback(err,data)
                })
            }
        ],function(err,data){
            if(err){winston.error('/lesson/get/info/media/:type',err);}
            return res.json({date: data[0],count:data[1]})
        })
    })
};