import { describe, expect, it } from "vitest";
import type { InstalledGitHubRepository } from "../github";
import {
  mergeInstalledRepositoriesIntoRecipes,
  type ExistingRecipeRecord,
} from "./repo-sync";

describe("mergeInstalledRepositoriesIntoRecipes", () => {
  it("preserves existing policy fields while refreshing GitHub installation metadata", () => {
    const existingRecipes: ExistingRecipeRecord[] = [
      {
        repo_owner: "acme",
        repo_name: "api",
        enabled: false,
        package_manager: "npm",
        install_command: "npm ci",
        test_command: "npm test",
        build_command: "npm run build",
        repro_command: "npm run repro",
        allowed_domains: ["api.internal"],
        allowed_command_categories: ["read", "test"],
        snapshot_id: "snap_123",
        ci_workflow_name: "CI",
        metadata: {
          ownerTeam: "platform",
          githubApp: {
            previous: true,
          },
        },
        installation_id: 10,
      },
    ];
    const installedRepositories: InstalledGitHubRepository[] = [
      {
        installationId: 42,
        owner: "acme",
        name: "api",
        fullName: "acme/api",
        defaultBranch: "develop",
        isPrivate: true,
      },
    ];

    const [mergedRecipe] = mergeInstalledRepositoriesIntoRecipes({
      existingRecipes,
      installedRepositories,
      syncedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(mergedRecipe).toMatchObject({
      repo_owner: "acme",
      repo_name: "api",
      enabled: false,
      package_manager: "npm",
      install_command: "npm ci",
      test_command: "npm test",
      build_command: "npm run build",
      repro_command: "npm run repro",
      allowed_domains: ["api.internal"],
      allowed_command_categories: ["read", "test"],
      snapshot_id: "snap_123",
      ci_workflow_name: "CI",
      installation_id: 42,
      metadata: {
        ownerTeam: "platform",
        defaultBranch: "develop",
        githubApp: {
          previous: true,
          syncedAt: "2026-03-21T10:00:00.000Z",
          installationId: 42,
          fullName: "acme/api",
          isPrivate: true,
        },
      },
    });
  });

  it("creates default policy values for newly discovered installation repositories", () => {
    const installedRepositories: InstalledGitHubRepository[] = [
      {
        installationId: 7,
        owner: "acme",
        name: "worker",
        fullName: "acme/worker",
        defaultBranch: "main",
        isPrivate: false,
      },
    ];

    const [mergedRecipe] = mergeInstalledRepositoriesIntoRecipes({
      existingRecipes: [],
      installedRepositories,
      syncedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(mergedRecipe).toMatchObject({
      repo_owner: "acme",
      repo_name: "worker",
      enabled: true,
      package_manager: "pnpm",
      install_command: "pnpm install",
      test_command: "pnpm test",
      build_command: null,
      repro_command: null,
      allowed_domains: [],
      allowed_command_categories: [
        "install",
        "repro",
        "test",
        "build",
        "search",
        "read",
        "write",
        "diff",
      ],
      snapshot_id: null,
      ci_workflow_name: null,
      installation_id: 7,
      metadata: {
        defaultBranch: "main",
        githubApp: {
          syncedAt: "2026-03-21T10:00:00.000Z",
          installationId: 7,
          fullName: "acme/worker",
          isPrivate: false,
        },
      },
    });
  });
});
