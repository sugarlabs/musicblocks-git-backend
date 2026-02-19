export enum ErrorCode {

    // VALIDATION ERRORS
    missing_required_fields = "missing_required_fields",
    missing_project_data = "missing_project_data",
    missing_commit_message = "missing_commit_message",
    missing_reponame = "missing_reponame",
    missing_source_repo = "missing_source_repo",
    missing_page = "missing_page",
    missing_fork_repo = "missing_fork_repo",
    missing_updated_project_data = "missing_updated_project_data",
    missing_key = "missing_key",
    missing_metadata_json = "missing_metadata_json",
    missing_swagger_doc = "missing_swagger_doc",

    // AUTHORIZATION ERRORS
    owner_verification_failed = "owner_verification_failed",
    invalid_key_permission_denied = "invalid_key_permission_denied",

    // REPOSITORY ERRORS
    invalid_repo = "invalid_repo",
    failed_to_fork_repository = "failed_to_fork_repository",
    failed_to_fork_repository_with_history = "failed_to_fork_repository_with_history",
    failed_to_get_reponame = "failed_to_get_reponame",

    // PROJECT ERRORS
    failed_to_get_projects = "failed_to_get_projects",
    failed_to_create_project = "failed_to_create_project",
    failed_to_update_project = "failed_to_update_project",
    failed_to_get_project_data = "failed_to_get_project_data",
    failed_to_get_project_data_with_commits = "failed_to_get_project_data_with_commits",

    // BRANCH ERRORS
    failed_to_create_branch = "failed_to_create_branch",
    branch_creation_returned_no_result = "branch_creation_returned_no_result",

    // PR ERRORS
    failed_to_get_pull_requests = "failed_to_get_pull_requests",
    failed_to_create_pull_request = "failed_to_create_pull_request",

    // OTHER
    swagger_file_not_found = "swagger_file_not_found",
    type_mismatch = "type_mismatch"
}