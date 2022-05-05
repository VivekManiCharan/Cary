import * as vscode from "vscode";
import { getNonce } from "./getNonce";

export class ProjectManager {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: ProjectManager | undefined;

  public static readonly viewType = "swiper";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (ProjectManager.currentPanel) {
        ProjectManager.currentPanel._panel.reveal(column);
        ProjectManager.currentPanel._update();
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
        ProjectManager.viewType,
      "VSinder",
      column || vscode.ViewColumn.One,
      {
        // Enable javascript in the webview
        enableScripts: true,

        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "media"),
          vscode.Uri.joinPath(extensionUri, "out/compiled"),
        ],
      }
    );

    ProjectManager.currentPanel = new ProjectManager(panel, extensionUri);
  }

  public static kill() {
    ProjectManager.currentPanel?.dispose();
    ProjectManager.currentPanel = undefined;
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    ProjectManager.currentPanel = new ProjectManager(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // // Handle messages from the webview
    // this._panel.webview.onDidReceiveMessage(
    //   (message) => {
    //     switch (message.command) {
    //       case "alert":
    //         vscode.window.showErrorMessage(message.text);
    //         return;
    //     }
    //   },
    //   null,
    //   this._disposables
    // );
  }

  public dispose() {
    ProjectManager.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async _update() {
    const webview = this._panel.webview;

    this._panel.webview.html = this._getHtmlForWebview(webview);
    webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {


    // // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out" , "compiled/ProjectManager.js")
    );

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    // // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();


    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
                -->
                <meta http-equiv="Content-Security-Policy" content=" img-src https: data:; ">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script nonce="${nonce}">
                    </script>
                    <link href="${styleResetUri}" rel="stylesheet">
            </head>
            <body>
			</body>
      <script nonce="${nonce}" src="${scriptUri}"></script>
           

				
			</html>`;
  }
}