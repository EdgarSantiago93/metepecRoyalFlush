## UI / UX
[x] media picker across the app needs to allow picking from both device and camera
[x] upload deposit proof page needs to be a bottom sheet, look into this [https://www.reddit.com/r/reactnative/comments/1qxyz05/when_to_use_bna_ui_bottomsheet_over_expo_router/](https://www.reddit.com/r/reactnative/comments/1qxyz05/when_to_use_bna_ui_bottomsheet_over_expo_router/) to decide what is best to use
[x] in the same page (upload deposit proof) camera and library needs to be a single button, suggest ui for this (this is inside the new bottom sheet)
[x] in the schedle session page, the time place and location inputs , should be placed above of the list, also, lets implement a date time picker for this, do not use scrolling-ios-pickers,look for better implmenetations
[x] when a session is in progress, the ribeyes requests dialogs are not the right height, the half-rebuy works but the full-rebuy does not have the same height, they should be equal (this might have been fixed already)
[x] in the same screen, the half and full rebuy buttons should be bigger

## Payouts (v1 — UI + mock only, backend TBD)
[x] Add banking info fields (nombre, cuenta, banco, clabe) to User type + seed data
[x] Add SeasonPayout type (pending | confirmed | disputed) + notification types
[x] Add payout API types + mock client methods (getPayouts, sendPayout, confirmPayout, disputePayout, resolvePayout, updateBankingInfo)
[x] Add payouts to app state context (season_ended state variant)
[x] Create /payouts route + PayoutsScreen component (player list, banking modal, deposit confirm)
[x] Add "Pagos" button to season-ended screen (treasurer/admin only)
[x] Show payout status banners on season-ended screen (pending, confirmed, disputed)
[x] Make profile banking info editable (edit mode with text inputs, save via updateBankingInfo)
[] Player confirm/dispute flow — add confirm/dispute buttons to player's season-ended view when payout is pending
[] Proof photo upload — add optional media upload on treasurer payout confirmation modal
[] Push notifications — wire payout_sent/payout_confirmed/payout_disputed notification types to real push
[] Backend integration — replace mock API with real endpoints when backend is ready