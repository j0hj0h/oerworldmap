package services;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import javax.annotation.Nonnull;

import org.elasticsearch.action.get.GetResponse;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.Client;
import org.elasticsearch.client.transport.TransportClient;
import org.elasticsearch.common.collect.ImmutableMap;
import org.elasticsearch.common.settings.ImmutableSettings;
import org.elasticsearch.common.settings.ImmutableSettings.Builder;
import org.elasticsearch.common.transport.InetSocketTransportAddress;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.SearchHit;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;

public class ElasticsearchClient {

  public static final Config CONFIG = ConfigFactory.parseFile(new File("conf/application.conf"))
      .resolve();

  private static final String ES_SERVER = CONFIG.getString("es.host.server");
  private static final Integer ES_PORT = CONFIG.getInt("es.host.port");
  private static final String ES_INDEX = CONFIG.getString("es.index.name");
  private static final String ES_TYPE = CONFIG.getString("es.index.type");
  private static final String ES_CLUSTER = CONFIG.getString("es.cluster.name");

  private static final InetSocketTransportAddress ES_NODE = new InetSocketTransportAddress(
      ES_SERVER, ES_PORT);

  private static final Builder CLIENT_SETTINGS = ImmutableSettings.settingsBuilder()
      .put("index.name", ES_INDEX).put("index.type", ES_TYPE).put("cluster.name", ES_CLUSTER)
      .put("client.transport.ping_timeout", 20, TimeUnit.SECONDS);

  private static Client mClient;

  public ElasticsearchClient() {
    @SuppressWarnings("resource")
    // try-with-resources and/or tc.close(); are each resulting in a
    // NoNodeAvailableException.
    final TransportClient tc = new TransportClient(CLIENT_SETTINGS.build());
    mClient = tc.addTransportAddress(ES_NODE);
    mClient.admin().indices().prepareUpdateSettings(ES_INDEX)
        .setSettings(ImmutableMap.of("index.refresh_interval", "1")).execute().actionGet();
  }

  public ElasticsearchClient(@Nonnull final Client aClient) {
    mClient = aClient;
  }

  public Client getClient() {
    return mClient;
  }

  public static String getIndex() {
    return ES_INDEX;
  }

  public static String getType() {
    return ES_TYPE;
  }

  /**
   * Add a document consisting of a JSON String.
   * 
   * @param aJsonString
   */
  public void addJson(final String aJsonString) {
    addJson(aJsonString, UUID.randomUUID());
  }

  /**
   * Add a document consisting of a JSON String specified by a given UUID.
   * 
   * @param aJsonString
   */
  public void addJson(final String aJsonString, final UUID aUuid) {
    mClient.prepareIndex(ES_INDEX, ES_TYPE, aUuid.toString()).setSource(aJsonString).execute()
        .actionGet();
  }
  
  /**
   * Add a document consisting of a JSON String specified by a given UUID.
   * 
   * @param aJsonString
   */
  public void addJson(final String aJsonString, final String aUuid) {
    mClient.prepareIndex(ES_INDEX, ES_TYPE, aUuid).setSource(aJsonString).execute()
        .actionGet();
  }

  /**
   * Add a document consisting of a Map.
   * 
   * @param aMap
   */
  public void addMap(final Map<String, Object> aMap) {
    addMap(aMap, UUID.randomUUID());
  }

  /**
   * Add a document consisting of a Map specified by a given UUID.
   * 
   * @param aMap
   */
  public void addMap(final Map<String, Object> aMap, final UUID aUuid) {
    mClient.prepareIndex(ES_INDEX, ES_TYPE, aUuid.toString()).setSource(aMap).execute().actionGet();
  }

  /**
   * Get all documents of a given document type
   * 
   * @param aType
   * @return a List of docs, each represented by a Map of String/Object.
   */
  public List<Map<String, Object>> getAllDocs(final String aType) {
    final int docsPerPage = 1024;
    int count = 0;
    SearchResponse response = null;
    final List<Map<String, Object>> docs = new ArrayList<Map<String, Object>>();
    while (response == null || response.getHits().hits().length != 0) {
      response = mClient.prepareSearch(ES_INDEX).setTypes(aType)
          .setQuery(QueryBuilders.matchAllQuery()).setSize(docsPerPage)
          .setFrom(count * docsPerPage).execute().actionGet();
      for (SearchHit hit : response.getHits()) {
        docs.add(hit.getSource());
      }
      count++;
    }
    return docs;
  }

  /**
   * Get a document of a specified type specified by an identifier.
   * 
   * @param aType
   * @param aIdentifier
   * @return the document as Map of String/Object
   */
  public Map<String, Object> getDocument(@Nonnull final String aType,
      @Nonnull final String aIdentifier) {
    final GetResponse response = mClient.prepareGet(ES_INDEX, aType, aIdentifier).execute()
        .actionGet();
    return response.getSource();
  }

  /**
   * Get a document of a specified type specified by a UUID.
   * 
   * @param aType
   * @param aUuid
   * @return the document as Map of String/Object
   */
  public Map<String, Object> getDocument(@Nonnull final String aType, @Nonnull final UUID aUuid) {
    return getDocument(aType, aUuid.toString());
  }

}
