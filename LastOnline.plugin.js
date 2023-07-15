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
    this.presenceEventListener = null;
    this.statuses = [];
    this.patches = [];
    this.classes = {};
    this.cache = {};
  }

  getAllUsers() {
    return PresenceStore.getUserIds();
  }

  saveToData(prop, val) {
    this.cache[prop] = val;
    this._lastSaveTime = this._lastSaveTime ?? Date.now();
    if (Date.now() - this._lastSaveTime > 300000) // 5 mins
    // if (Date.now() - this._lastSaveTime > 10) // 10 ms
    {
      console.log("%c[LastOnline]%c Saving data to file...", "color: blue;", "color: initial;");
      BdApi.Data.save("LastOnline", "data", this.cache);
      this._lastSaveTime = Date.now();
    }
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
    this.cache = BdApi.Data.load("LastOnline", "data") ?? {};
    this.classes["defCol1"] = BdApi.Webpack.getModule(x => x.defaultColor && x.tabularNumbers).defaultColor;
    this.classes["defCol2"] = BdApi.Webpack.getModule(x => x.defaultColor && !x.tabularNumbers && !x.error).defaultColor;
    this.usernameCreatorModuleGetter = (() => {
      const theString = `"User Tag"`;
      const theFilter = x2 => x2 && x2.toString?.().includes(theString); // I don't trust the BD's byString filter
      const theFilterMain = x => x && Object.values(x).some(theFilter); // Haha xDD
      const theModule = BdApi.Webpack.getModule(theFilterMain);
      // return Object.values(BdApi.Webpack.getModule(theFilterMain)).filter(theFilter)[0];
      // return Object.keys(obj).find(prop => obj[prop].toString?.().includes(theString));
      const funcName = Object.keys(theModule).find(prop => theFilter(theModule[prop]));
      return { funcName, theFunc: theModule[funcName], theModule };
    })();
    this.presenceEventListener = event => {
      const userId = event.updates[0].user.id;
      const status = event.updates[0].status;

      const userIndex = this.statuses.findIndex(user => user.userId === userId);

      if (status === 'offline') {
        if (userIndex !== -1) {
          this.statuses[userIndex].newDate = new Date();
        } else {
          const user = UserStore.getUser(userId);

          if (user) {
            // let a = [...this.statuses, {
            //   userId,
            //   user,
            //   newDate: new Date()
            // }];
            let a = {
              userId,
              user,
              newDate: new Date(),
            };
            // BdApi.Data.save("LastOnline", userId, JSON.stringify(a))
            this.saveToData(userId, a);
          }
        }
      }

      console.log(`${UserStore.getUser(event.updates[0].user.id)} has went ${status}`);
      console.log(this.statuses);
    };

    BdApi.Webpack.getModule(e => e.dispatch && !e.emitter && !e.commands).subscribe("PRESENCE_UPDATES", this.presenceEventListener);
    const usernameCreatorModule = this.usernameCreatorModuleGetter;
    this.addPatch("after", usernameCreatorModule.theModule, usernameCreatorModule.funcName, (_, args, ret) => {
      console.log("patch worked!", ret);
      const targetProps = ret.props.children.props.children[0].props.children.props.children[0].props.children;

      const userId = args[0]?.user?.id;

      let lastOnlineData;
      // try {
      //   // lastOnlineData = JSON.parse(BdApi.Data.load("LastOnline", userId));
      //   lastOnlineData = this.cache[userId];
      // } catch (error) {
      //   lastOnlineData = "None";
      // }
      lastOnlineData = this.cache[userId] ?? "None";

      const offlineData = this.statuses.find((user) => user.userId === userId);
      const offlineDate = offlineData ? offlineData.newDate : lastOnlineData.newDate;

      const lastTimeOnline = offlineDate || lastOnlineData.newDate; // Use lastTimeOnline variable

      const modProps = [
        targetProps,
        BdApi.React.createElement(
          "h1",
          {
            style: { display: "inline-flex", marginLeft: "5px", fontSize: "smaller" },
            className: `${this.classes["defCol1"]} ${this.classes["defCol2"]}`,
          },
          lastTimeOnline ? "Last Online: " + lastTimeOnline.toLocaleString() : "Last Online: None"
        ),
      ];

      ret.props.children.props.children[0].props.children.props.children[0].props.children = modProps;
      return ret;
    });
  }

  stop() {
    BdApi.Webpack.getModule(e => e.dispatch && !e.emitter && !e.commands).unsubscribe("PRESENCE_UPDATES", this.presenceEventListener);
    this.patches.forEach(x => x());
    BdApi.Data.save("LastOnline", "data", this.cache);
  }
}

module.exports = LastOnline;
