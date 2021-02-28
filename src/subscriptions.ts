import { IContext } from "./extension";
import { workspace, window } from "vscode";
import { sendFile } from "./sendFile";
import { SendDiff } from "./models/SendDiff";

export const subscriptions = (ctx: IContext) => {
  ctx.context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("ankifork.defaultDeck")) {
        ctx.config.defaultDeck =
          workspace.getConfiguration("ankifork").get("defaultDeck") || "";
      }

      if (e.affectsConfiguration("ankifork.log")) {
        ctx.config.log =
          workspace.getConfiguration("ankifork").get("log") || "error";
      }
    })
  );

  ctx.context.subscriptions.push(
    workspace.onDidSaveTextDocument((e) => {
      if (e.languageId == "markdown") {
        if (workspace.getConfiguration("ankifork.send").get("keepSync")) {
          sendFile(e.uri, ctx, true).then((diff) => {
            if (diff && diff instanceof SendDiff) {
              window.showInformationMessage("Auto send results: " + diff.toString());
            }
          });
        }
      }      
    })
  );
}
