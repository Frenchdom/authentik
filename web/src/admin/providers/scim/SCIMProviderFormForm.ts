import { DEFAULT_CONFIG } from "@goauthentik/common/api/config";
import { first } from "@goauthentik/common/utils";
import "@goauthentik/elements/ak-dual-select/ak-dual-select-dynamic-selected-provider.js";
import { DualSelectPair } from "@goauthentik/elements/ak-dual-select/types.js";
import "@goauthentik/elements/forms/FormGroup";
import "@goauthentik/elements/forms/HorizontalFormElement";
import "@goauthentik/elements/forms/Radio";
import "@goauthentik/elements/forms/SearchSelect";

import { msg } from "@lit/localize";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

import {
    CoreApi,
    CoreGroupsListRequest,
    Group,
    PropertymappingsApi,
    SCIMMapping,
    SCIMProvider,
} from "@goauthentik/api";

export async function scimPropertyMappingsProvider(page = 1, search = "") {
    const propertyMappings = await new PropertymappingsApi(
        DEFAULT_CONFIG,
    ).propertymappingsProviderScimList({
        ordering: "managed",
        pageSize: 20,
        search: search.trim(),
        page,
    });
    return {
        pagination: propertyMappings.pagination,
        options: propertyMappings.results.map((m) => [m.pk, m.name, m.name, m]),
    };
}

export function makeSCIMPropertyMappingsSelector(
    instanceMappings: string[] | undefined,
    defaultSelected: string,
) {
    const localMappings = instanceMappings ? new Set(instanceMappings) : undefined;
    return localMappings
        ? ([pk, _]: DualSelectPair) => localMappings.has(pk)
        : ([_0, _1, _2, mapping]: DualSelectPair<SCIMMapping>) =>
              mapping?.managed === defaultSelected;
}

export function renderForm(provider?: Partial<SCIMProvider>, errors: ValidationError = {}) {
    return html`
        <ak-form-element-horizontal label=${msg("Name")} required name="name">
            <input
                type="text"
                value="${ifDefined(provider?.name)}"
                class="pf-c-form-control"
                required
            />
        </ak-form-element-horizontal>

        <ak-form-group expanded>
            <span slot="header"> ${msg("Protocol settings")} </span>
            <div slot="body" class="pf-c-form">
                <ak-form-element-horizontal label=${msg("URL")} required name="url">
                    <input
                        type="text"
                        value="${first(provider?.url, "")}"
                        class="pf-c-form-control"
                        required
                    />
                    <p class="pf-c-form__helper-text">
                        ${msg("SCIM base url, usually ends in /v2.")}
                    </p>
                </ak-form-element-horizontal>
                <ak-form-element-horizontal name="verifyCertificates">
                    <label class="pf-c-switch">
                        <input
                            class="pf-c-switch__input"
                            type="checkbox"
                            ?checked=${first(provider?.verifyCertificates, true)}
                        />
                        <span class="pf-c-switch__toggle">
                            <span class="pf-c-switch__toggle-icon">
                                <i class="fas fa-check" aria-hidden="true"></i>
                            </span>
                        </span>
                        <span class="pf-c-switch__label"
                            >${msg("Verify SCIM server's certificates")}</span
                        >
                    </label>
                </ak-form-element-horizontal>
                <ak-form-element-horizontal label=${msg("Token")} required name="token">
                    <input
                        type="text"
                        value="${first(provider?.token, "")}"
                        class="pf-c-form-control"
                        required
                    />
                    <p class="pf-c-form__helper-text">
                        ${msg(
                            "Token to authenticate with. Currently only bearer authentication is supported.",
                        )}
                    </p>
                </ak-form-element-horizontal>
            </div>
        </ak-form-group>
        <ak-form-group expanded>
            <span slot="header">${msg("User filtering")}</span>
            <div slot="body" class="pf-c-form">
                <ak-form-element-horizontal name="excludeUsersServiceAccount">
                    <label class="pf-c-switch">
                        <input
                            class="pf-c-switch__input"
                            type="checkbox"
                            ?checked=${first(provider?.excludeUsersServiceAccount, true)}
                        />
                        <span class="pf-c-switch__toggle">
                            <span class="pf-c-switch__toggle-icon">
                                <i class="fas fa-check" aria-hidden="true"></i>
                            </span>
                        </span>
                        <span class="pf-c-switch__label">${msg("Exclude service accounts")}</span>
                    </label>
                </ak-form-element-horizontal>
                <ak-form-element-horizontal label=${msg("Group")} name="filterGroup">
                    <ak-search-select
                        .fetchObjects=${async (query?: string): Promise<Group[]> => {
                            const args: CoreGroupsListRequest = {
                                ordering: "name",
                                includeUsers: false,
                            };
                            if (query !== undefined) {
                                args.search = query;
                            }
                            const groups = await new CoreApi(DEFAULT_CONFIG).coreGroupsList(args);
                            return groups.results;
                        }}
                        .renderElement=${(group: Group): string => {
                            return group.name;
                        }}
                        .value=${(group: Group | undefined): string | undefined => {
                            return group ? group.pk : undefined;
                        }}
                        .selected=${(group: Group): boolean => {
                            return group.pk === provider?.filterGroup;
                        }}
                        blankable
                    >
                    </ak-search-select>
                    <p class="pf-c-form__helper-text">
                        ${msg("Only sync users within the selected group.")}
                    </p>
                </ak-form-element-horizontal>
            </div>
        </ak-form-group>

        <ak-form-group expanded>
            <span slot="header"> ${msg("Attribute mapping")} </span>
            <div slot="body" class="pf-c-form">
                <ak-form-element-horizontal
                    label=${msg("User Property Mappings")}
                    name="propertyMappings"
                >
                    <ak-dual-select-dynamic-selected
                        .provider=${scimPropertyMappingsProvider}
                        .selector=${makeSCIMPropertyMappingsSelector(
                            provider?.propertyMappings,
                            "goauthentik.io/providers/scim/user",
                        )}
                        available-label=${msg("Available User Property Mappings")}
                        selected-label=${msg("Selected User Property Mappings")}
                    ></ak-dual-select-dynamic-selected>
                    <p class="pf-c-form__helper-text">
                        ${msg("Property mappings used to user mapping.")}
                    </p>
                </ak-form-element-horizontal>
                <ak-form-element-horizontal
                    label=${msg("Group Property Mappings")}
                    name="propertyMappingsGroup"
                >
                    <ak-dual-select-dynamic-selected
                        .provider=${scimPropertyMappingsProvider}
                        .selector=${makeSCIMPropertyMappingsSelector(
                            provider?.propertyMappingsGroup,
                            "goauthentik.io/providers/scim/group",
                        )}
                        available-label=${msg("Available Group Property Mappings")}
                        selected-label=${msg("Selected Group Property Mappings")}
                    ></ak-dual-select-dynamic-selected>
                    <p class="pf-c-form__helper-text">
                        ${msg("Property mappings used to group creation.")}
                    </p>
                </ak-form-element-horizontal>
            </div>
        </ak-form-group>
    `;
}
