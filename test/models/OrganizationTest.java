package models;

import helpers.JsonHelpers;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.junit.Assert;
import org.junit.Test;

import com.github.fge.jsonschema.core.report.ProcessingReport;

public class OrganizationTest {

  private static final String mSchemaPath = "conf/datatypes/Organization.jsonld";
  private static final String mDataPath = "conf/sampleData/OrganizationSample.json";

  @Test
  public void validateAgainstSchema() {
    try {
      final String schema = new String(Files.readAllBytes(Paths.get(mSchemaPath)),
          StandardCharsets.UTF_8);
      final String data = new String(Files.readAllBytes(Paths.get(mDataPath)),
          StandardCharsets.UTF_8);
      ProcessingReport report = JsonHelpers.validate(data, schema);
      Assert.assertTrue(report.isSuccess());
    } catch (IOException e) {
      e.printStackTrace();
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
