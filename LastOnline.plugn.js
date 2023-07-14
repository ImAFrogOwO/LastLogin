/**
 * @name LastOnline
 * @description Allows you to see when someone went last online.
 * @author davilarek && _ninelota_
 * @version 1.0.0
 */

const { Webpack } = BdApi;
const PresenceStore = Webpack.getStore('PresenceStore');
const UserStore = Webpack.getStore('UserStore');

class LastOnline {
  constructor() {
    this.t = null;
    this.statuses = [];
  }

  getAllUsers() {
    return PresenceStore.getUserIds();
  }

  start() {
    this.t = event => {
      const userId = event.updates[0].user.id;
      const status = event.updates[0].status;

      const userIndex = this.statuses.findIndex(user => user.userId === userId);

      if (status === 'offline') {
        if (userIndex !== -1) {
          this.statuses[userIndex].newDate = new Date();
        } else {
          const user = UserStore.getUser(userId);
      
          if (user) {
            this.statuses.push({
              userId,
              user,
              newDate: new Date()
            });
          }
        }
      }
      

      console.log(`${UserStore.getUser(event.updates[0].user.id)} has went ${status}`);
      console.log(this.statuses)
    };

    BdApi.Webpack.getModule(e => e.dispatch && !e.emitter && !e.commands).subscribe("PRESENCE_UPDATES", this.t);
  }

  stop() {
    BdApi.Webpack.getModule(e => e.dispatch && !e.emitter && !e.commands).unsubscribe("PRESENCE_UPDATES", this.t);
  }
}

module.exports = LastOnline;
