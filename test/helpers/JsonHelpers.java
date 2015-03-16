package helpers;

import com.fasterxml.jackson.databind.JsonNode;
import com.github.fge.jackson.JsonLoader;
import com.github.fge.jsonschema.core.report.ProcessingReport;
import com.github.fge.jsonschema.main.JsonSchema;
import com.github.fge.jsonschema.main.JsonSchemaFactory;

public class JsonHelpers {

  public static ProcessingReport validate(String jsonData, String jsonSchema)
      throws Exception {
    JsonNode schemaNode = JsonLoader.fromString(jsonSchema);
    JsonNode data = JsonLoader.fromString(jsonData);
    JsonSchemaFactory factory = JsonSchemaFactory.byDefault();
    JsonSchema schema = factory.getJsonSchema(schemaNode);
    return schema.validate(data);
  }
}
