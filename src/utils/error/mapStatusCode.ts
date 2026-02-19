import { ErrorCode } from "./errorCodes";

export function mapStatusCode(code: ErrorCode): number {
    switch (code) {
        case ErrorCode.missing_commit_message:
        case ErrorCode.missing_fork_repo:
        case ErrorCode.missing_key:
        case ErrorCode.missing_metadata_json:
        case ErrorCode.missing_page:
        case ErrorCode.missing_project_data:
        case ErrorCode.missing_reponame:
        case ErrorCode.missing_required_fields:
        case ErrorCode.missing_source_repo:
        case ErrorCode.missing_swagger_doc:
        case ErrorCode.swagger_file_not_found:
        case ErrorCode.missing_updated_project_data:
            return 400;

        case ErrorCode.owner_verification_failed:
        case ErrorCode.invalid_key_permission_denied:
            return 401;

        case ErrorCode.branch_creation_returned_no_result:
        case ErrorCode.failed_to_create_branch:
        case ErrorCode.failed_to_create_project:
        case ErrorCode.failed_to_create_pull_request:
        case ErrorCode.failed_to_fork_repository:
        case ErrorCode.failed_to_fork_repository_with_history:
        case ErrorCode.failed_to_get_project_data:
        case ErrorCode.failed_to_get_project_data_with_commits:
        case ErrorCode.failed_to_get_projects:
        case ErrorCode.failed_to_get_pull_requests:
        case ErrorCode.failed_to_get_reponame:
        case ErrorCode.failed_to_update_project:
        case ErrorCode.invalid_repo:
            return 404;

        case ErrorCode.type_mismatch:
            return 422;

        default:
            return 500;
    }
}