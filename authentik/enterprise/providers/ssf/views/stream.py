from django.urls import reverse
from rest_framework.fields import CharField, ChoiceField, ListField, SerializerMethodField
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from structlog.stdlib import get_logger
from rest_framework.mixins import CreateModelMixin, DestroyModelMixin

from authentik.core.api.utils import PassiveSerializer
from authentik.enterprise.providers.ssf.models import DeliveryMethods, EventTypes, Stream
from authentik.enterprise.providers.ssf.views.base import SSFView

LOGGER = get_logger()


class StreamDeliverySerializer(PassiveSerializer):
    method = ChoiceField(choices=[(x.value, x.value) for x in DeliveryMethods])
    endpoint_url = CharField(allow_null=True)


class StreamSerializer(ModelSerializer):

    delivery = StreamDeliverySerializer()
    events_requested = ListField(
        child=ChoiceField(choices=[(x.value, x.value) for x in EventTypes])
    )
    format = CharField()
    aud = ListField(child=CharField())

    def create(self, validated_data):
        return super().create(
            {
                "delivery_method": validated_data["delivery"]["method"],
                "endpoint_url": validated_data["delivery"].get("endpoint_url"),
                "format": validated_data["format"],
                "provider": validated_data["provider"],
                "events_requested": validated_data["events_requested"],
                "aud": validated_data["aud"],
            }
        )

    class Meta:
        model = Stream
        fields = [
            "delivery",
            "events_requested",
            "format",
            "aud",
        ]


class StreamResponseSerializer(PassiveSerializer):

    stream_id = CharField(source="pk")
    iss = SerializerMethodField()
    aud = ListField(child=CharField())
    delivery = SerializerMethodField()

    events_requested = ListField(child=CharField())
    events_supported = SerializerMethodField()
    events_delivered = ListField(child=CharField(), source="events_requested")

    def get_iss(self, instance: Stream) -> str:
        request: Request = self._context["request"]
        if not instance.provider.application:
            return None
        return request.build_absolute_uri(
            reverse(
                "authentik_providers_ssf:configuration",
                kwargs={
                    "application_slug": instance.provider.application.slug,
                    "provider": instance.provider.pk,
                },
            )
        )

    def get_delivery(self, instance: Stream) -> StreamDeliverySerializer:
        return {
            "method": instance.delivery_method,
            "endpoint_url": instance.endpoint_url,
        }

    def get_events_supported(self, instance: Stream) -> list[str]:
        return [x.value for x in EventTypes]


class StreamView(SSFView):
    def post(self, request: Request, *args, **kwargs) -> Response:
        stream = StreamSerializer(data=request.data)
        stream.is_valid(raise_exception=True)
        instance =stream.save(provider=self.provider)
        response = StreamResponseSerializer(instance=instance, context={
            "request": request
        }).data
        print(response)
        return Response(response, status=201)

    def delete(self, request: Request, *args, **kwargs) -> Response:
        streams = Stream.objects.filter(provider=self.provider)
        # Technically this parameter is required by the spec...
        if "stream_id" in request.query_params:
            streams = streams.filter(stream_id=request.query_params["stream_id"])
        streams.delete()
        return Response(status=204)
