import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as editEventMacros from "server/event/manage/event-manage.macros";
import * as formMacros from "server/macros/form.macros";
import { ifTrue } from "server/macros/jsx-utils";
import { eventManageBase } from "./event-manage.base.template";

export default function render(context: CommonLocals) {
  const { event, eventPresetsData, user } = context;
  const eventDetails = event?.related("details");

  formMacros.registerCodeMirrorScripts(context);

  return eventManageBase(context, <div>
    <h1 id="title-display"></h1>

    <form method="post" enctype="multipart/form-data" class="js-warn-on-unsaved-changes">
      {context.csrfTokenJSX()}

      <ul class="nav nav-tabs nav-justified mb-3">
        <li role="presentation" class="nav-item">
          <a class="nav-link active" href="#state" data-toggle="tab">State</a>
        </li>
        <li role="presentation" class="nav-item">
          <a class="nav-link" href="#appearance" data-toggle="tab">Appearance</a>
        </li>
        <li role="presentation" class="nav-item">
          <a class="nav-link" href="#config" data-toggle="tab">Jam config</a>
        </li>
      </ul>

      <div class="tab-content">
        <div id="state" class="tab-pane show active">
          <div class="container">
            <div class="form-group">
              <label for="logo"><b>Preset</b></label>
              <select id="js-edit-event-status-preset" name="event-preset-id" class="js-select" style="width: 100%"
                data-placeholder="None (Custom state)" data-allow-clear="true">
                <option value=""></option>
                {eventPresetsData.map(eventPresetData =>
                  <option value={eventPresetData.id} data-attributes={JSON.stringify(eventPresetData)}
                    selected={event && event.get("event_preset_id") === eventPresetData.id}>
                    {eventPresetData.title}
                  </option>
                )}
              </select>
            </div>
            <div id="js-edit-event-status-error" class="alert alert-danger d-none"></div>
            <div class="form-group">
              <label for="logo"><b>Advanced state form</b></label>
              <div>
                <div id="js-edit-event-status-toggles" class="btn-group">
                  <input type="button" class={"btn btn-outline-secondary "
                    + ((!event || event.get("event_preset_id")) ? "active" : "")} value="Hide" />
                  <input type="button" class={"btn btn-outline-secondary "
                    + (event && !event.get("event_preset_id") ? "active" : "")} value="Show" />
                </div>
              </div>
            </div>
            <div id="js-state-advanced d-none">
              {editEventMacros.countdownForm(event)}
              {editEventMacros.stateForm(event)}
            </div>
          </div>
        </div>

        <div id="appearance" class="tab-pane show">
          <div class="container">
            <div class="row">
              <div class="col-md-7">
                <div class="form-group input-group-lg">
                  <label for="title">Title</label>
                  <input type="text" class="form-control js-sync-text js-sync-slug" name="title" value={event?.get("title")} required
                    data-sync-text-display-selector="#title-display"
                    data-sync-text-default="My event"
                    data-sync-slug-input-selector="#name" />
                </div>
              </div>
              <div class="col-md-5">
                <div class="form-group input-group-lg">
                  <label for="name">Slug</label>
                  <input type="text" class="form-control" id="name" name="name" value={event?.get("name")} required autocomplete="off" />
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-8">
                <div class="form-group">
                  <label for="display-dates">Displayed dates</label>
                  <input type="text" class="form-control" name="display-dates" value={event?.get("display_dates")} />
                </div>
              </div>
              <div class="col-md-4">
                <div class="form-group">
                  <label for="title">Event start date
                    {formMacros.tooltip("The jam start date. Used to sort events, "
                      + "but also to let state presets guess deadlines correctly.")}</label>
                  {formMacros.dateTimePicker("started-at", event?.get("started_at"), { serverFormat: "yyyy-MM-dd", pickerFormat: "YYYY-MM-DD" })}
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="title">Displayed theme</label>
                  <input type="text" class="form-control" name="display-theme" value={event?.get("display_theme")} />
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group">
                  <label for="status-rules">Rules blog post</label>
                  {rulesBlogPostField(event)}
                </div>
              </div>
            </div>

            {editEventMacros.linksForm(event?.related("details"))}

            <div class="horizontal-bar">
              Pictures
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="logo">Logo</label>
                  {formMacros.pictureInput("logo", event?.get("logo"), { noCard: true, model: event })}
                  <div class="legend">Ideal logo size: about 196x196, although slightly bigger images will not be resized and can overflow nicely.</div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label for="logo">Background</label>
                  {formMacros.pictureInput("background", eventDetails?.get("background"), { noCard: true, model: eventDetails })}
                  <div class="legend">Ideal background size: 1920x540 or more. Will resize to always cover full window width.</div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="logo">Banner <i>(deprecated)</i></label>
                  {formMacros.pictureInput("banner", eventDetails?.get("banner"), { noCard: true, model: eventDetails })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="config" class="tab-pane show">
          {editEventMacros.jamConfigForm(event, event?.related("details"))}
        </div>
      </div>

      <div class="container mt-4">
        <div class="row">
          <div class="col">
            {ifTrue(event && event.id, () =>
              <div>
                {ifTrue(event.get("status") === "pending", () =>
                  <a href={links.routeUrl(event, "event", "delete")}
                    onclick="return confirm('Do you really want to delete this event? This cannot be undone.')"
                    class={"btn btn-danger " + !user.get("is_admin") ? "disabled" : ""}
                    title={!user.get("is_admin") ? "Only admins can delete events" : ""}>Delete</a>
                )}
                {ifTrue(event.get("status") !== "pending", () =>
                  <div class="btn btn-danger disabled" data-placement="top"
                    data-toggle="tooltip" title="Only pending events can be deleted">Delete</div>
                )}
              </div>
            )}
          </div>
          <div class="col ml-auto text-right">
            {/* TODO Publish */}
            <input type="submit" class="btn btn-primary" value="Save changes" />
            <a class="btn btn-outline-primary" href="#" onclick="history.back()">Cancel</a>
          </div>
        </div>
      </div>

    </form>
  </div>);
}

function rulesBlogPostField(event) {
  const defaultRulesPage = "/article/docs/alakajam-competition-rules";
  return <div>
    {event ? formMacros.radio("status-rules", "off", "Off", event.get("status_rules")) : "off"}
    {formMacros.radio("status-rules", defaultRulesPage, "Default", event?.get("status_rules"))}
    {
      formMacros.radio("status-rules", "", "", event?.get("status_rules"), {
        textField: true,
        placeholder: "Post ID or URL",
        textFieldEnabled: event && event.get("status_rules") && event.get("status_rules") !== "off" && event.get("status_rules") !== defaultRulesPage
      })
    }
  </div>;
}
