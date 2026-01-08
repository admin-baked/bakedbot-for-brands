# How to Fix GitHub Permissions for `bakedbot-for-brands`

The deployment is failing because the standard `gh auth login` token lacks specific write permissions for the private repository `admin-baked/bakedbot-for-brands`.

## Option 1: Use a Personal Access Token (Recommended)

1.  **Generate a Token**:
    *   Go to: https://github.com/settings/tokens/new
    *   **Note**: "BakedBot Agent Deployment"
    *   **Expiration**: 30 days (or as desired)
    *   **Select Scopes**: Check the **`repo`** box (Full control of private repositories).
    *   Click **Generate token**.
    *   **COPY** the token (starts with `ghp_`).

2.  **Update Remote URL** (in your VS Code Terminal):
    Replace `YOUR_TOKEN` with the token you just copied.
    ```bash
    git remote set-url origin https://admin-baked:YOUR_TOKEN@github.com/admin-baked/bakedbot-for-brands.git
    ```

3.  **Push the Branch**:
    ```bash
    git push origin feat/gauntlet-verification
    ```

## Option 2: SSH Keys (Advanced)

If you have SSH keys set up:
1.  **Switch Remote to SSH**:
    ```bash
    git remote set-url origin git@github.com:admin-baked/bakedbot-for-brands.git
    ```
2.  **Push**:
    ```bash
    git push origin feat/gauntlet-verification
    ```

## Option 3: Manual Patching

If the above fail, I have saved your work in a patch file.
1.  Locate `gauntlet-integration.patch` in the root folder.
2.  Send this file to a teammate who *can* push.
3.  They run:
    ```bash
    git apply gauntlet-integration.patch
    git push
    ```
