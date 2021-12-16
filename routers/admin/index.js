import express from 'express';
import winston from 'winston';
import User from "../../models/User";
import config from "../../config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt-node";
import {check, validationResult} from "express-validator/check";
import {matchedData} from "express-validator/filter";
import path from "path";
import fs from "fs";
import Admin from '../../models/Admin';
import companyRoutes from './company_routers';
import bundleRoutes from './bundle_routers';
import companyTransactionRoutes from './company_transaction_routers';
import companyRequestsRoutes from './company_request_routers'
import auth from "../../auth";
import {locale} from "../../lang";

module.exports = function(app) {
    app.get('/logout',function(req, res){
        req.session.destroy();
        res.clearCookie('token', { domain: `.${req.domain}` });
        return res.redirect("/");
    });
    app.post('/api/admin/login' , [
        check('username')
            .trim(),
        check('password')
            .trim(),
    ], function(req, res){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success: false, msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        Admin.findOne({username: data.username}).deepPopulate('avatar').lean().exec(function (err, user) {
            if(err) {
                winston.error(err)
            }
            if (!user) {
                return res.json({success: false, msg: locale("user_not_found")});
            } else {
                let ps = user.password.replace("$2y$", "$2a$");
                if (bcrypt.compareSync(data.password, ps)) {
                    let token = jwt.sign({id: user._id}, config.jwt_secret, {
                        expiresIn: 60*60*24
                    });
                    let tokenConf = { hostOnly:false,domain:`.${req.domain}` };
                    tokenConf = {...tokenConf, maxAge: 86400000};
                    res.cookie('token',token, tokenConf);
                    return res.status(200).json({success: true, admin: {...user, password: null}});
                } else {
                    return res.status(200).json({success: false, msg: locale("passwordError.error")});
                }
            }
        });
    });

    const company_route = express.Router();
    companyRoutes(company_route);
    app.use('/api/admin', company_route);

    const bundle_route = express.Router();
    bundleRoutes(bundle_route);
    app.use('/api/admin', bundle_route);

    const compTrans = express.Router();
    companyTransactionRoutes(compTrans);
    app.use('/api/admin', compTrans);

    const compReqs = express.Router();
    companyRequestsRoutes(compReqs);
    app.use('/api/admin', compReqs);

    app.get(['/admin/*','/admin'], function(req, res, next){
        const initialState = {
            main:{
                admin:req.admin
            }
        };
        var data = fs.readFileSync(`${path.join(__dirname, '../../../hrx_react', 'static')}/manifest.json`);
        let manifest = JSON.parse(data);
        res.header("Content-Type", "text/html; charset=utf-8");
        res.status(req.admin ? 200 : 401).end(renderIndex( initialState, manifest));
    });

};

function renderIndex(initialState, manifest) {
    const html =  `
    <!doctype html>
    <html lang="en">
      <head>
      <title>${locale("title")}</title> 
        <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height">
        <link href='/images/favicon.png' rel='shortcut icon' />
        <link rel="manifest" href="/manifest.json" />
        <script src="https://cdn.tiny.cloud/1/xo6szqntkvg39zc2iafs9skjrw8s20sm44m28p3klgjo26y3/tinymce/5/tinymce.min.js"></script>
      </head>
      <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}
      </script>
      <body>
        <div id="admin">            </div>
        <script src=${process.env.NODE_ENV === 'development' ? '/dist/admin.js' : manifest["admin.js"]}></script>
        
      </body>
    </html>
  `
    return html;
}