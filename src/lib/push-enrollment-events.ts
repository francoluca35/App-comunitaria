export const PUSH_ENROLLMENT_CHANGED_EVENT = 'comunidad-push-enrollment-changed'

export function notifyPushEnrollmentChanged(): void {
	if (typeof window === 'undefined') return
	window.dispatchEvent(new CustomEvent(PUSH_ENROLLMENT_CHANGED_EVENT))
}
