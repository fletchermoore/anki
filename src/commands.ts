import { IContext } from "./extension";
import { Uri, commands, ProgressLocation, window, workspace, FileType } from "vscode";
import * as fs from 'fs';
import { Transformer } from "./markdown/transformer";
import { CONSTANTS } from "./constants";
import { getLogger } from "./logger";
import { initialSetup } from "./initialSetup";
import { allMarkdownUri } from "./fsUtils";
import { MarkdownFile } from './models/MarkdownFile';
import { sendFile } from "./sendFile";
import { SendDiff } from "./models/SendDiff";

export const registerCommands = (ctx: IContext) => {
  // Handle Syncing the Anki Instance
  let disposableSync = commands.registerCommand("ankifork.sync", async () => {
    // The code you place here will be executed every time your command is executed
    window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Syncing your Anki Instance...",
        cancellable: false,
      },
      async () => {
        try {
          await ctx.ankiService.syncGui();
        } catch (e) {
          window.showErrorMessage(CONSTANTS.failedToConnectMessage);
        }
      }
    );
  });

  // Handle Syncing the Anki Instance
  let disposableSendToDeck = commands.registerCommand(
    "ankifork.sendToDeck",
    async () => {
      // The code you place here will be executed every time your command is executed
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Sending to Deck: ${ctx.config.defaultDeck}...`,
          cancellable: false,
        },
        async () => {
          try {
            getLogger().info("active Editor..");
            await new Transformer(MarkdownFile.fromActiveTextEditor(), ctx.ankiService, true).transform();
          } catch (e) {
            window.showErrorMessage(e.toString());
          }
        }
      );
    }
  );

  // Handle Syncing the Anki Instance
  let disposableSendToStandalone = commands.registerCommand(
    "ankifork.sendToStandalone",
    async () => {
      // The code you place here will be executed every time your command is executed
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Sending to own deck...`,
          cancellable: false,
        },
        async () => {
          try {
            await new Transformer(MarkdownFile.fromActiveTextEditor(), ctx.ankiService, false).transform();
          } catch (e) {
            getLogger().error(e);
            getLogger().error(
              "This is usually because there is no H1 or something is before the title heading"
            );
            window.showErrorMessage(`Deck not sent: ${e.message}`);
          }
        }
      );
    }
  );


  let disposableSendDir = commands.registerCommand(
    "ankifork.sendDir",
    async () => {
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Sending everything...`,
          cancellable: false
        },
        async () => {
          try {
            const uris = await allMarkdownUri();
            const diffs: SendDiff[] = [];
            for (let i = 0; i < uris.length; i++)
            {
              try {
                console.log("about to send "+ uris[i].fsPath);
                const diff = await sendFile(uris[i], ctx, false);
                if (diff instanceof SendDiff) {
                  diffs.push(diff);
                  console.log("sent", diff.toString());
                } else {
                  console.log("send failed");
                }               
                
              } catch(err) {
                console.log("failed to send with error: ", err);
              }
            }
            window.showInformationMessage(SendDiff.combine(diffs).toString());
          } catch(err)
          {
            console.log("failed to retrieve markdown files", err);
            window.showErrorMessage("Failed to retrieve markdown files from workspace.");
          }
        }
      );
    }
  );

  let disposableTreeItemOpen = commands.registerCommand(
    "ankifork.treeItem",
    async (uri) => {
      const doc = await workspace.openTextDocument(Uri.parse(uri));
      window.showTextDocument(doc);
    }
  );

  let disposableForceInstall = commands.registerCommand(
    "ankifork.forceInstall",
    async () => {
      await initialSetup(ctx);
    }
  );


  ctx.context.subscriptions.push(
    disposableSync,
    disposableSendToDeck,
    disposableSendToStandalone,
    disposableSendDir,
    disposableTreeItemOpen,
    disposableForceInstall
  );
};
