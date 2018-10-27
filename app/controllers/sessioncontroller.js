const moment = require('moment')

function sessionController(req, res, next) {
    req.db.sessions.findOne({ where: { key: req.body.sessionId } }).then((session) => {
        if (!session) {
        } else if (moment(new Date()).format('YYYY-MM-DD HH:mm') > moment(session.lastVisit).add(50, 'minutes').format('YYYY-MM-DD HH:mm')) {
            req.db.sessions.destroy({
                where: {
                    id: session.id
                }
            }).then(ok => {
                next()
            })

        } else {
            req.db.sessions.update({
                lastVisit: moment(new Date).format('YYYY-MM-DD HH:mm'),
            },
                {
                    where: {
                        key: session.key
                    }
                }
            ).then(() => {
                req.db.users.findOne({
                    where: {id: session.userId}
                })
                .then(result => {
                    console.log('result')
                    console.log('result ', result)

                    req.db.operators.findOne({
                        where: {id: result.operatorId}
                    })
                    .then(operator => {
                        if(operator.status && result.status) {
                            req.userSession = session
                            next()
                        } else {
                            res.statusCode = 403
                            res.end()
                        }
                    })
                })
            })

        }
    })
}
module.exports = sessionController
