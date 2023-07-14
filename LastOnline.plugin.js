/**
 * @name LastOnline
 * @description Allows you to see when someone went last online.
 * @author davilarek, _ninelota_
 * @version 1.0.0
 */

const { Webpack } = BdApi;
const PresenceStore = Webpack.getStore('PresenceStore');
const UserStore = Webpack.getStore('UserStore');

class LastOnline {
  constructor() {
    this.t = null;
    this.statuses = [];
    this.patches = [];
  }

  getAllUsers() {
    return PresenceStore.getUserIds();
  }

  /**
   * @param {"after" | "before" | "instead"} patchType
   * @param {object} moduleToPatch
   * @param {string} functionName
   * @param {Function} callback
   */
  addPatch(patchType, moduleToPatch, functionName, callback) {
    this.patches.push(
      (BdApi.Patcher[patchType])("LastOnline", moduleToPatch, functionName, callback)
    );
  }

  start() {
    this.usernameCreatorModuleGetter = (() => {
      const theString = `"User Tag"`;
      const theFilter = x2 => x2 && x2.toString?.().includes(theString); // I don't trust the BD's byString filter
      const theFilterMain = x => x && Object.values(x).some(theFilter);
      const theModule = BdApi.Webpack.getModule(theFilterMain);
      // return Object.values(BdApi.Webpack.getModule(theFilterMain)).filter(theFilter)[0];
      // return Object.keys(obj).find(prop => obj[prop].toString?.().includes(theString));
      const funcName = Object.keys(theModule).find(prop => theFilter(theModule[prop]));
      return { funcName, theFunc: theModule[funcName], theModule };
    })();
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
      console.log(this.statuses);
    };

    BdApi.Webpack.getModule(e => e.dispatch && !e.emitter && !e.commands).subscribe("PRESENCE_UPDATES", this.t);
    const usernameCreatorModule = this.usernameCreatorModuleGetter;
    this.addPatch("after", usernameCreatorModule.theModule, usernameCreatorModule.funcName, (_, args, ret) => {
      console.log("patch worked!", ret);
    });
  }

  stop() {
    BdApi.Webpack.getModule(e => e.dispatch && !e.emitter && !e.commands).unsubscribe("PRESENCE_UPDATES", this.t);
    this.patches.forEach(x => x());
  }
}

module.exports = LastOnline;
